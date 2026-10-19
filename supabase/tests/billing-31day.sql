-- Transactional regression: no real student or provider payment is changed.
begin;
-- Resolve a non-exempt student by database role, never by a payment-supplied identity.
select set_config('test.billing_student',(select p.id::text from profiles p left join billing_accounts a on a.student_id=p.id where p.role='student' and p.active and not coalesce(a.exempt,false) order by p.id limit 1),true);
insert into billing_accounts(student_id,is_test,enrolled,environment) values(current_setting('test.billing_student')::uuid,true,true,'sandbox') on conflict(student_id) do update set is_test=true,enrolled=true,environment='sandbox';
update billing_settings set sandbox_enabled=true;
do $$declare sid uuid=current_setting('test.billing_student')::uuid; oid uuid; paid timestamptz='2026-10-01T12:00:00Z'; until_at timestamptz; n integer;begin
 for n in 1..2 loop
  insert into billing_orders(student_id,kind,amount_cents,method,period_start,period_end) values(sid,'monthly',6000,'PIX','2026-10-01','2026-11-01') returning id into oid;
  perform billing_record_payment('test31:'||n,'PAYMENT_RECEIVED',jsonb_build_object('student_id',sid,'order_id',oid,'asaas_id','test31:'||n,'amount_cents',6000,'status','paid','due_date','2026-10-01','period_end','2026-11-01','paid_at',paid));
  perform billing_record_payment('test31:'||n,'PAYMENT_RECEIVED',jsonb_build_object('student_id',sid,'order_id',oid,'asaas_id','test31:'||n,'amount_cents',6000,'status','paid','due_date','2026-10-01','period_end','2026-11-01','paid_at',paid));
 end loop;
 select access_until into until_at from billing_accounts where student_id=sid;
 if until_at<>paid+interval '62 days' then raise exception 'renewal_or_dedup_failed: %',until_at;end if;
 update billing_accounts set access_until=now()-interval '5 days' where student_id=sid;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.billing_student'),true);
set local role authenticated;
do $$begin
 if (billing_access_status()->>'allowed')::boolean then raise exception 'expired_access_allowed';end if;
 if exists(select 1 from training_plans) then raise exception 'expired_training_visible';end if;
 if not exists(select 1 from billing_accounts where student_id=auth.uid()) then raise exception 'billing_hidden';end if;
 if not exists(select 1 from profiles where id=auth.uid()) then raise exception 'login_profile_hidden';end if;
 if has_table_privilege('authenticated','public.billing_card_tokens','SELECT') then raise exception 'tokens_exposed';end if;
end $$;
reset role;
update billing_accounts set access_until=now()-interval '4 days' where student_id=current_setting('test.billing_student')::uuid;
set local role authenticated;
do $$begin if not (billing_access_status()->>'allowed')::boolean or billing_access_status()->>'status'<>'grace' then raise exception 'grace_denied';end if;end $$;
reset role;
rollback;
