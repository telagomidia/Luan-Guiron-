-- Independent opt-in for synthetic Mercado Pago accounts; production remains disabled.
alter table public.billing_settings add column mercadopago_sandbox_enabled boolean not null default false;
alter table public.billing_orders add column provider text not null default 'asaas' check(provider in ('asaas','mercadopago'));
alter table public.billing_orders drop constraint billing_orders_method_check;
alter table public.billing_orders add constraint billing_orders_method_check check(method in ('PIX','CREDIT_CARD','CHECKOUT'));
create function public.billing_record_mp_payment(event_id text,event_name text,payment jsonb) returns void
language plpgsql security invoker set search_path=public as $$
begin
 if (payment->>'asaas_id') !~ '^mp:[0-9]+$' or not exists(
 select 1 from billing_orders o join billing_accounts a on a.student_id=o.student_id
 where o.id=(payment->>'order_id')::uuid and o.student_id=(payment->>'student_id')::uuid
 and o.provider='mercadopago' and o.environment='sandbox' and a.is_test and a.environment='sandbox'
 ) then raise exception 'mercadopago_test_order_required';end if;
 perform public.billing_record_payment(event_id,event_name,payment);
end $$;
revoke all on function public.billing_record_mp_payment(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.billing_record_mp_payment(text,text,jsonb) to service_role;
create or replace function public.billing_access_status() returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare a billing_accounts%rowtype; s billing_settings%rowtype; enforced boolean;begin
 if auth.uid() is null then raise exception 'unauthenticated'; end if;
 if public.is_trainer() then return jsonb_build_object('allowed',true,'status','trainer'); end if;
 select * into s from billing_settings where id=true;
 select * into a from billing_accounts where student_id=auth.uid();
 enforced=coalesce(a.enrolled,false) and ((s.enabled and s.environment='production' and a.environment='production') or (s.sandbox_enabled and a.is_test and s.environment='sandbox' and a.environment='sandbox') or (s.mercadopago_sandbox_enabled and a.is_test and a.environment='sandbox'));
 return jsonb_build_object('allowed',not enforced or coalesce(a.exempt,false) or (a.access_until is not null and now()<a.access_until+interval '5 days'),
 'status',case when coalesce(a.exempt,false) then 'exempt' when not enforced then 'not_started' when a.access_until is null then 'payment_required' when now()<a.access_until then 'active' when now()<a.access_until+interval '5 days' then 'grace' else 'payment_required' end,
 'access_until',a.access_until,'grace_until',a.access_until+interval '5 days','duration_days',31,'grace_days',5);
end $$;
revoke all on function public.billing_access_status() from public,anon;
grant execute on function public.billing_access_status() to authenticated;
