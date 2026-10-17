-- Additive billing foundation. Financial activation is explicitly disabled.
create table public.billing_settings (
 id boolean primary key default true check(id),
 monthly_cents integer not null default 6000 check(monthly_cents>0),
 enabled boolean not null default false,
 environment text not null default 'sandbox' check(environment in ('sandbox','production')),
 starts_on date,
 grace_days integer check(grace_days between 0 and 30)
);
insert into public.billing_settings(id) values(true);
create table public.billing_accounts (
 student_id uuid primary key references public.profiles(id),
 exempt boolean not null default false,
 exemption_note text,
 asaas_customer_id text unique,
 asaas_subscription_id text unique,
 subscription_status text,
 updated_at timestamptz not null default now()
);
create table public.billing_services (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 120),
 description text not null default '',
 price_cents integer not null check(price_cents>0),
 active boolean not null default false
);
create table public.billing_orders (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('monthly','assessment')),
 service_id uuid references public.billing_services(id),
 amount_cents integer not null check(amount_cents>0),
 method text not null check(method in ('PIX','CREDIT_CARD')),
 period_start date not null,
 period_end date not null check(period_end>period_start),
 status text not null default 'creating',
 provider_id text unique,
 payment_url text,
 created_at timestamptz not null default now(),
 check((kind='monthly' and service_id is null) or (kind='assessment' and service_id is not null))
);
create unique index billing_monthly_open on public.billing_orders(student_id,period_start)
 where kind='monthly' and status not in ('canceled','expired','failed');
create unique index billing_one_open_monthly on public.billing_orders(student_id) where kind='monthly' and status in ('creating','pending');
create table public.billing_payments (
 asaas_id text primary key,
 student_id uuid not null references public.profiles(id),
 order_id uuid references public.billing_orders(id),
 subscription_id text,
 amount_cents integer not null,
 status text not null,
 due_date date not null,
 period_end date not null,
 paid_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.billing_events (
 id text primary key,
 event text not null,
 resource_id text,
 processed_at timestamptz not null default now()
);
-- Financial tables never accept student writes; service_role alone creates orders/payments/events.
alter table public.billing_settings enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.billing_services enable row level security;
alter table public.billing_orders enable row level security;
alter table public.billing_payments enable row level security;
alter table public.billing_events enable row level security;
revoke all on public.billing_settings,public.billing_accounts,public.billing_services,public.billing_orders,public.billing_payments,public.billing_events from anon,authenticated;
grant all on public.billing_settings,public.billing_accounts,public.billing_services,public.billing_orders,public.billing_payments,public.billing_events to service_role;
grant select on public.billing_settings,public.billing_accounts,public.billing_services,public.billing_orders,public.billing_payments to authenticated;
grant update on public.billing_settings to authenticated;
grant insert,update on public.billing_accounts,public.billing_services to authenticated;
create policy settings_read on public.billing_settings for select to authenticated using(true);
-- Activation and environment changes are server-only; UI updates only pricing.
revoke update on public.billing_settings from authenticated;
grant update(monthly_cents) on public.billing_settings to authenticated;
create policy settings_trainer on public.billing_settings for update to authenticated using(public.is_trainer()) with check(public.is_trainer());
create policy account_read on public.billing_accounts for select to authenticated using(student_id=(select auth.uid()) or public.is_trainer());
revoke insert,update on public.billing_accounts from authenticated;
grant insert(student_id,exempt,exemption_note),update(exempt,exemption_note) on public.billing_accounts to authenticated;
create policy account_trainer_insert on public.billing_accounts for insert to authenticated with check(public.is_trainer());
create policy account_trainer_update on public.billing_accounts for update to authenticated using(public.is_trainer()) with check(public.is_trainer());
create policy service_read on public.billing_services for select to authenticated using(active or public.is_trainer());
create policy service_trainer_insert on public.billing_services for insert to authenticated with check(public.is_trainer());
create policy service_trainer_update on public.billing_services for update to authenticated using(public.is_trainer()) with check(public.is_trainer());
create policy order_read on public.billing_orders for select to authenticated using(student_id=(select auth.uid()) or public.is_trainer());
create policy payment_read on public.billing_payments for select to authenticated using(student_id=(select auth.uid()) or public.is_trainer());
-- Service-only RPC makes event deduplication and payment synchronization atomic.
create function public.billing_record_payment(event_id text,event_name text,payment jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
 insert into billing_events(id,event,resource_id) values(event_id,event_name,payment->>'asaas_id') on conflict do nothing;
 if not found then return; end if;
 insert into billing_payments(asaas_id,student_id,order_id,subscription_id,amount_cents,status,due_date,period_end,paid_at)
 values(payment->>'asaas_id',(payment->>'student_id')::uuid,(payment->>'order_id')::uuid,payment->>'subscription_id',(payment->>'amount_cents')::integer,payment->>'status',(payment->>'due_date')::date,(payment->>'period_end')::date,(payment->>'paid_at')::timestamptz)
 on conflict(asaas_id) do update set status=excluded.status,paid_at=excluded.paid_at,updated_at=now();
 update billing_orders set status=payment->>'status' where id=(payment->>'order_id')::uuid;
end $$;
revoke all on function public.billing_record_payment(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.billing_record_payment(text,text,jsonb) to service_role;
