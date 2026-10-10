-- Synthetic identities only. No existing student or clinical record is changed.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('77777777-0000-4000-8000-000000000001','onboarding-qa-teacher@example.invalid',now(),'{"full_name":"Onboarding QA Teacher"}'),
 ('77777777-0000-4000-8000-000000000002','onboarding-qa-student@example.invalid',now(),'{"full_name":"Onboarding QA Student"}'),
 ('77777777-0000-4000-8000-000000000003','onboarding-qa-other@example.invalid',now(),'{"full_name":"Onboarding QA Other"}');
update public.profiles set role='trainer' where id='77777777-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.anamneses(id,student_id,training_goal,sleep_hours,submitted_at,updated_at)
values ('77777777-0000-4000-8000-000000000010','77777777-0000-4000-8000-000000000002','QA objective',7.5,now(),now())
on conflict(id) do update set training_goal=excluded.training_goal,submitted_at=excluded.submitted_at,updated_at=excluded.updated_at;
insert into public.anamneses(id,student_id,training_goal,sleep_hours,submitted_at,updated_at)
values ('77777777-0000-4000-8000-000000000010','77777777-0000-4000-8000-000000000002','QA confirmed retry',7.5,now(),now())
on conflict(id) do update set training_goal=excluded.training_goal,submitted_at=excluded.submitted_at,updated_at=excluded.updated_at;
do $$ begin
 if (select count(*) from public.anamneses where id='77777777-0000-4000-8000-000000000010')<>1 then raise exception 'Retry duplicated or lost'; end if;
 if not exists(select 1 from public.anamneses where id='77777777-0000-4000-8000-000000000010' and student_id=auth.uid() and submitted_at is not null and sleep_hours=7.5 and training_goal='QA confirmed retry') then raise exception 'Confirmed submission missing'; end if;
 begin
  insert into public.anamneses(student_id,training_goal) values('77777777-0000-4000-8000-000000000003','QA denied');
  raise exception 'Foreign write allowed' using errcode='ZX001';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"77777777-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.anamneses where id='77777777-0000-4000-8000-000000000010') then raise exception 'Foreign student read allowed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"77777777-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 if not exists(select 1 from public.anamneses where id='77777777-0000-4000-8000-000000000010' and student_id='77777777-0000-4000-8000-000000000002' and submitted_at is not null) then raise exception 'Teacher panel cannot read linked submission'; end if;
end $$;
reset role;
update public.profiles set active=false where id='77777777-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 begin
  insert into public.anamneses(student_id,training_goal) values(auth.uid(),'QA inactive');
  raise exception 'Inactive submission allowed' using errcode='ZX001';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: authenticated own write, same-ID retry, submission timestamp, decimal sleep, teacher visibility, foreign write/read isolation, inactive write denial' as qa;
rollback;
