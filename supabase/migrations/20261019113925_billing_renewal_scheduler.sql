create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;
create or replace function lg_private.enqueue_billing_worker() returns void
language plpgsql security invoker set search_path='' as $$
declare nonce text; job uuid;
begin
 if not exists(select 1 from public.billing_settings s where (s.enabled and s.environment='production') or (s.sandbox_enabled and s.environment='sandbox')) then return; end if;
 nonce=gen_random_uuid()::text||gen_random_uuid()::text;
 insert into public.billing_jobs(kind,token_hash,expires_at) values('worker',encode(extensions.digest(nonce,'sha256'),'hex'),now()+interval '5 minutes') returning id into job;
 perform net.http_post(url:='https://ziunjhebdkqdmvsrjxhm.supabase.co/functions/v1/billing-worker',body:=jsonb_build_object('job_id',job,'token',nonce),headers:='{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds:=100000);
 delete from public.billing_jobs where expires_at<now()-interval '7 days';
end $$;
revoke all on function lg_private.enqueue_billing_worker() from public,anon,authenticated;
select cron.schedule('billing-renewal-five-minutes','*/5 * * * *','select lg_private.enqueue_billing_worker()');
