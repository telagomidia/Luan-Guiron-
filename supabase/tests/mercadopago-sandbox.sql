begin;
select set_config('test.mp_student',(select p.id::text from profiles p left join billing_accounts a on a.student_id=p.id where p.role='student' and p.active and not coalesce(a.exempt,false) and not coalesce(a.is_test,false) order by p.id limit 1),true);
insert into billing_accounts(student_id,is_test,enrolled,environment) values(current_setting('test.mp_student')::uuid,true,true,'sandbox') on conflict(student_id) do update set is_test=true,enrolled=true,environment='sandbox';
update billing_settings set mercadopago_sandbox_enabled=true;
do $$declare sid uuid=current_setting('test.mp_student')::uuid; oid uuid; payload jsonb; expiry timestamptz;begin
 insert into billing_orders(student_id,kind,provider,environment,method,amount_cents,period_start,period_end) values(sid,'monthly','mercadopago','sandbox','CHECKOUT',6000,'2026-10-19','2026-11-19') returning id into oid;
 payload=jsonb_build_object('student_id',sid,'order_id',oid,'asaas_id','mp:123456789','amount_cents',6000,'status','paid','due_date','2026-10-19','period_end','2026-11-19','paid_at','2026-10-19T18:00:00Z');
 perform billing_record_mp_payment('mp:test:1','MERCADOPAGO_APPROVED',payload);
 perform billing_record_mp_payment('mp:test:1','MERCADOPAGO_APPROVED',payload);
 select access_until into expiry from billing_accounts where student_id=sid;
 if expiry<>'2026-11-19T18:00:00Z'::timestamptz then raise exception '31_days_or_dedup_failed';end if;
 update billing_orders set provider='asaas' where id=oid;
 begin
  perform billing_record_mp_payment('mp:test:wrong','WRONG_PROVIDER',payload);
  raise exception 'wrong_provider_accepted';
 exception when others then if sqlerrm<>'mercadopago_test_order_required' then raise;end if;end;
 update billing_orders set provider='mercadopago' where id=oid;
 perform billing_record_mp_payment('mp:test:refund','MERCADOPAGO_REFUND',jsonb_set(payload,'{status}','"refunded"'));
 if (select access_until from billing_accounts where student_id=sid) is not null then raise exception 'refund_credit_retained';end if;
 if has_function_privilege('authenticated','public.billing_record_mp_payment(text,text,jsonb)','EXECUTE') then raise exception 'student_can_credit_payment';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.mp_student'),true);
set local role authenticated;
do $$begin
 if (billing_access_status()->>'allowed')::boolean then raise exception 'unpaid_mp_account_allowed';end if;
 if exists(select 1 from training_plans) then raise exception 'unpaid_training_visible';end if;
 if not exists(select 1 from billing_accounts where student_id=auth.uid()) then raise exception 'payment_area_unavailable';end if;
end $$;
reset role;
rollback;
