-- Isolated homologation data only. Existing billing and student tables/policies are unchanged.
create table public.billing_sandbox_runs(id uuid primary key default gen_random_uuid(),token_hash text not null,expires_at timestamptz not null,state text not null default 'ready',customer_id text,payment_id text unique,invoice_url text,amount_cents integer not null default 6000 check(amount_cents=6000),provider_status text,paid_at timestamptz,access_until timestamptz,error_code text,created_at timestamptz not null default now());
create table public.billing_sandbox_events(id text primary key,run_id uuid not null references public.billing_sandbox_runs(id),event text not null,status text not null,received_at timestamptz not null default now());
alter table public.billing_sandbox_runs enable row level security;
alter table public.billing_sandbox_events enable row level security;
revoke all on public.billing_sandbox_runs,public.billing_sandbox_events from public,anon,authenticated;
grant all on public.billing_sandbox_runs,public.billing_sandbox_events to service_role;
create function public.billing_record_sandbox_event(p_run uuid,p_event_id text,p_event text,p_status text) returns void language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from billing_sandbox_runs where id=p_run for update;
 insert into billing_sandbox_events(id,run_id,event,status) values(p_event_id,p_run,p_event,p_status) on conflict do nothing;
 if not found then return; end if;
 update billing_sandbox_runs set provider_status=p_status,paid_at=case when p_status in ('CONFIRMED','RECEIVED') then coalesce(paid_at,now()) else paid_at end,access_until=case when p_status in ('CONFIRMED','RECEIVED') then coalesce(paid_at,now())+interval '31 days' else null end where id=p_run;
end $$;
revoke all on function public.billing_record_sandbox_event(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.billing_record_sandbox_event(uuid,text,text,text) to service_role;
