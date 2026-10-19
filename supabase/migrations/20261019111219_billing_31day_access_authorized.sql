-- Billing stays disabled for existing students; Sandbox is opt-in per account.
alter table public.billing_settings add column duration_days integer not null default 31 check(duration_days=31);
alter table public.billing_settings add column sandbox_enabled boolean not null default false;
update public.billing_settings set grace_days=5;
alter table public.billing_accounts add column is_test boolean not null default false;
alter table public.billing_accounts add column enrolled boolean not null default false;
alter table public.billing_accounts add column access_until timestamptz;
alter table public.billing_accounts add column auto_renew boolean not null default false;
alter table public.billing_accounts add column price_cents integer check(price_cents>0);
alter table public.billing_accounts add column renewal_issue text;
alter table public.billing_accounts add column environment text not null default 'sandbox' check(environment in ('sandbox','production'));
alter table public.billing_orders add column auto_renew_consent boolean not null default false;
alter table public.billing_orders add column cycle_due_at timestamptz not null default now();
alter table public.billing_orders add column environment text not null default 'sandbox' check(environment in ('sandbox','production'));
-- A paid order can be renewed on the same day; only unfinished orders reserve a cycle.
drop index public.billing_monthly_open;
create unique index billing_monthly_cycle on public.billing_orders(student_id,period_start) where kind='monthly' and status in ('creating','pending','overdue','review');
create unique index billing_paid_order_once on public.billing_payments(order_id) where status='paid';
create table public.billing_card_tokens(student_id uuid primary key references public.profiles(id),customer_id text not null,token text not null,environment text not null,updated_at timestamptz not null default now());
create table public.billing_attempts(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.billing_orders(id),attempt_day integer not null check(attempt_day between 0 and 5),status text not null default 'reserved',attempted_at timestamptz not null default now(),unique(order_id,attempt_day));
create table public.billing_jobs(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('sandbox','worker')),token_hash text not null,expires_at timestamptz not null,state text not null default 'ready',result jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
alter table public.billing_card_tokens enable row level security;
alter table public.billing_attempts enable row level security;
alter table public.billing_jobs enable row level security;
revoke all on public.billing_card_tokens,public.billing_attempts,public.billing_jobs from public,anon,authenticated;
grant all on public.billing_card_tokens,public.billing_attempts,public.billing_jobs to service_role;

create or replace function public.billing_record_payment(event_id text,event_name text,payment jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare sid uuid; oid uuid; item record; until_at timestamptz; credit_at timestamptz;begin
 sid=(payment->>'student_id')::uuid; oid=(payment->>'order_id')::uuid;
 -- Account lock serializes distinct payment events and early renewals.
 perform 1 from billing_accounts where student_id=sid for update;
 if not found then raise exception 'account_missing'; end if;
 if not exists(select 1 from billing_orders where id=oid and student_id=sid and amount_cents=(payment->>'amount_cents')::integer) then raise exception 'order_mismatch'; end if;
 insert into billing_events(id,event,resource_id) values(event_id,event_name,payment->>'asaas_id') on conflict do nothing;
 if not found then return; end if;
 insert into billing_payments(asaas_id,student_id,order_id,subscription_id,amount_cents,status,due_date,period_end,paid_at)
 values(payment->>'asaas_id',sid,oid,payment->>'subscription_id',(payment->>'amount_cents')::integer,payment->>'status',(payment->>'due_date')::date,(payment->>'period_end')::date,case when payment->>'status'='paid' then coalesce((payment->>'paid_at')::timestamptz,now()) end)
 on conflict(asaas_id) do update set status=case when billing_payments.status='paid' and excluded.status in ('pending','overdue') then billing_payments.status else excluded.status end,paid_at=coalesce(billing_payments.paid_at,excluded.paid_at),updated_at=now();
 update billing_orders set status=(select status from billing_payments where asaas_id=payment->>'asaas_id') where id=oid;
 -- Recompute from canonical paid history, excluding assessments, refunds and disputes.
 until_at=null;
 for item in select p.paid_at from billing_payments p join billing_orders o on o.id=p.order_id where p.student_id=sid and p.status='paid' and o.kind='monthly' order by p.paid_at,p.asaas_id loop
  credit_at=greatest(coalesce(until_at,item.paid_at),item.paid_at);until_at=credit_at+interval '31 days';
 end loop;
 update billing_accounts set access_until=until_at,updated_at=now() where student_id=sid;
end $$;
revoke all on function public.billing_record_payment(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.billing_record_payment(text,text,jsonb) to service_role;

create function public.billing_access_status() returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare a billing_accounts%rowtype; s billing_settings%rowtype; enforced boolean;begin
 if auth.uid() is null then raise exception 'unauthenticated'; end if;
 if public.is_trainer() then return jsonb_build_object('allowed',true,'status','trainer'); end if;
 select * into s from billing_settings where id=true;
 select * into a from billing_accounts where student_id=auth.uid();
 enforced=coalesce(a.enrolled,false) and ((s.enabled and s.environment='production' and a.environment='production') or (s.sandbox_enabled and a.is_test and s.environment='sandbox' and a.environment='sandbox'));
 return jsonb_build_object('allowed',not enforced or coalesce(a.exempt,false) or (a.access_until is not null and now()<a.access_until+interval '5 days'),
 'status',case when coalesce(a.exempt,false) then 'exempt' when not enforced then 'not_started' when a.access_until is null then 'payment_required' when now()<a.access_until then 'active' when now()<a.access_until+interval '5 days' then 'grace' else 'payment_required' end,
 'access_until',a.access_until,'grace_until',a.access_until+interval '5 days','duration_days',31,'grace_days',5);
end $$;
revoke all on function public.billing_access_status() from public,anon;
grant execute on function public.billing_access_status() to authenticated;
create function public.billing_has_access() returns boolean language sql stable security invoker set search_path=public as $$select (public.billing_access_status()->>'allowed')::boolean$$;
revoke all on function public.billing_has_access() from public,anon;
grant execute on function public.billing_has_access() to authenticated;
-- Restrictive policies combine with ownership policies; login/profile and billing stay accessible.
do $$declare t text;begin
 for t in select distinct tablename from pg_policies where schemaname='public' and policyname='active_profile_guard' loop
 execute format('create policy billing_access_guard on public.%I as restrictive for all to authenticated using ((select public.billing_has_access())) with check ((select public.billing_has_access()))',t);
 end loop;
end $$;
create policy billing_storage_guard on storage.objects as restrictive for all to authenticated
using(bucket_id not in ('progress-photos','assessment-documents','assessment-docs') or (select public.billing_has_access()))
with check(bucket_id not in ('progress-photos','assessment-documents','assessment-docs') or (select public.billing_has_access()));
