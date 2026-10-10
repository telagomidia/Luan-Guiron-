-- Disposable QA. Never persist these identities, files or snapshots.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('99999999-0000-4000-8000-000000000001','security-qa-trainer@example.invalid',now(),'{"full_name":"Security QA Trainer"}'),
 ('99999999-0000-4000-8000-000000000002','security-qa-student@example.invalid',now(),'{"full_name":"Security QA Student","role":"trainer"}'),
 ('99999999-0000-4000-8000-000000000003','security-qa-foreign@example.invalid',now(),'{"full_name":"Security QA Foreign"}'),
 ('99999999-0000-4000-8000-000000000004','security-qa-unverified@example.invalid',null,'{"full_name":"Security QA Unverified"}');
update public.profiles set role='trainer' where id='99999999-0000-4000-8000-000000000001';
insert into public.admin_activation_allowlist(email,role,full_name,claimed_by,claimed_at)
values('security-qa-trainer@example.invalid','trainer','QA','99999999-0000-4000-8000-000000000001',now());
insert into public.admin_activation_allowlist(email,role,full_name) values
 ('security-qa-foreign@example.invalid','trainer','QA First Claim'),
 ('security-qa-unverified@example.invalid','trainer','QA Unverified');
insert into public.training_plans(id,student_id,name,created_by) values
 ('99999999-0000-4000-8000-000000000010','99999999-0000-4000-8000-000000000002','Security QA','99999999-0000-4000-8000-000000000001');
insert into storage.objects(bucket_id,name) values ('assessment-documents','99999999-0000-4000-8000-000000000002/security-qa.pdf');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare b jsonb; begin
 if not public.is_trainer() then raise exception 'Active trainer rejected'; end if;
 if public.claim_admin_profile() <> 'trainer' then raise exception 'Idempotent claim failed'; end if;
 update public.profiles set observations='PRIVATE QA NOTE' where id='99999999-0000-4000-8000-000000000002';
 if not exists(select 1 from lg_private.profile_notes where profile_id='99999999-0000-4000-8000-000000000002' and observations='PRIVATE QA NOTE') then raise exception 'Note not preserved'; end if;
 if exists(select 1 from public.profiles where observations is not null) then raise exception 'Public note leaked'; end if;
 update public.profiles set goal='Other field updated' where id='99999999-0000-4000-8000-000000000002';
 if not exists(select 1 from jsonb_array_elements(public.get_trainer_profile_notes()) n where n->>'profile_id'='99999999-0000-4000-8000-000000000002' and n->>'observations'='PRIVATE QA NOTE') then raise exception 'Unrelated profile update lost note'; end if;
 update public.profiles set observations=null where id='99999999-0000-4000-8000-000000000002';
 if not exists(select 1 from lg_private.profile_notes where profile_id='99999999-0000-4000-8000-000000000002') then raise exception 'Cached client null erased private note'; end if;
 update public.profiles set observations='' where id='99999999-0000-4000-8000-000000000002';
 if exists(select 1 from lg_private.profile_notes where profile_id='99999999-0000-4000-8000-000000000002') then raise exception 'Explicit note clearing failed'; end if;
 update public.profiles set observations='PRIVATE QA NOTE' where id='99999999-0000-4000-8000-000000000002';
 update storage.objects set metadata='{"qa":true}' where name='99999999-0000-4000-8000-000000000002/security-qa.pdf';
 if not found then raise exception 'Teacher document update denied'; end if;
 b:=public.export_system_backup();
 if jsonb_array_length(b->'tables'->'profiles')<3 or b ? 'auth' then raise exception 'Backup format failed'; end if;
 perform set_config('lg.qa_snapshot',b::text,true);
end $$;
-- Students cannot invoke privileged backup/notes, even with editable metadata claiming trainer.
select set_config('request.jwt.claims','{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated","user_metadata":{"role":"trainer"}}',true);
do $$ begin
 if public.is_trainer() then raise exception 'Metadata role escalation'; end if;
 if exists(select 1 from lg_private.profile_notes) then raise exception 'Private note leaked'; end if;
 if not exists(select 1 from public.training_plans where id='99999999-0000-4000-8000-000000000010') then raise exception 'Own plan not accessible'; end if;
 if not exists(select 1 from storage.objects where name='99999999-0000-4000-8000-000000000002/security-qa.pdf') then raise exception 'Own PDF denied'; end if;
 begin perform public.export_system_backup(); raise exception 'Student backup allowed' using errcode='ZX001'; exception when raise_exception then null; end;
 begin perform public.get_trainer_profile_notes(); raise exception 'Student notes allowed' using errcode='ZX001'; exception when raise_exception then null; end;
 begin perform public.claim_admin_profile(); raise exception 'Unlisted claim allowed' using errcode='ZX001'; exception when raise_exception then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"99999999-0000-4000-8000-000000000004","role":"authenticated","email":"security-qa-trainer@example.invalid"}',true);
do $$ begin
 begin perform public.claim_admin_profile(); raise exception 'Unverified claim allowed' using errcode='ZX001'; exception when raise_exception then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"99999999-0000-4000-8000-000000000003","role":"authenticated","email":"wrong@example.invalid"}',true);
do $$ begin
 if public.claim_admin_profile()<>'trainer' then raise exception 'Verified first claim failed'; end if;
end $$;
-- STABLE authorization reads the calling statement snapshot; check the next request.
do $$ begin if not public.is_trainer() then raise exception 'First claim role not persisted'; end if; end $$;
select set_config('request.jwt.claims','{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated"}',true);
reset role;
update public.profiles set active=false where id in ('99999999-0000-4000-8000-000000000001','99999999-0000-4000-8000-000000000002');
set local role authenticated;
do $$ begin
 if exists(select 1 from public.training_plans) or exists(select 1 from public.exercise_library) or exists(select 1 from storage.objects where bucket_id in ('progress-photos','assessment-docs','assessment-documents')) then raise exception 'Inactive student retained data access'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and active=false) then raise exception 'Inactive profile explanation lost'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare n int; begin
 if public.is_trainer() or exists(select 1 from public.training_plans) or exists(select 1 from lg_private.profile_notes) then raise exception 'Inactive trainer retained access'; end if;
 update public.profiles set active=true where id=auth.uid(); get diagnostics n=row_count;
 if n<>0 then raise exception 'Trainer reactivated self'; end if;
 begin perform public.claim_admin_profile(); raise exception 'Allowlist reactivation allowed' using errcode='ZX001'; exception when raise_exception then null; end;
 begin perform public.export_system_backup(); raise exception 'Inactive backup allowed' using errcode='ZX001'; exception when raise_exception then null; end;
end $$;
reset role;
-- Restore all app rows into temporary clones, never into production tables.
do $$ declare b jsonb := current_setting('lg.qa_snapshot')::jsonb; t text; restored jsonb; fk record; missing bigint; begin
 for t in select jsonb_object_keys(b->'tables') loop
  execute format('create temporary table %I (like public.%I including constraints including indexes) on commit drop','qa_restore_'||t,t);
  execute format('insert into %I select * from jsonb_populate_recordset(null::public.%I,$1)','qa_restore_'||t,t) using b->'tables'->t;
  execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]''::jsonb) from %I r','qa_restore_'||t) into restored;
  if restored<>(select coalesce(jsonb_agg(x order by x::text),'[]'::jsonb) from jsonb_array_elements(b->'tables'->t) x) then raise exception 'Restore mismatch: %',t; end if;
 end loop;
 for fk in select c.conrelid::regclass::text child,c.confrelid::regclass::text parent, a.attname childcol,p.attname parentcol
 from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
 join pg_attribute p on p.attrelid=c.confrelid and p.attnum=c.confkey[1]
 where c.contype='f' and c.connamespace='public'::regnamespace and c.confrelid::regclass::text<>'auth.users' loop
  execute format('select count(*) from %I c left join %I p on c.%I=p.%I where c.%I is not null and p.%I is null','qa_restore_'||fk.child,'qa_restore_'||fk.parent,fk.childcol,fk.parentcol,fk.childcol,fk.parentcol) into missing;
  if missing>0 then raise exception 'Restore orphan: %',fk.child; end if;
 end loop;
 create temporary table qa_restore_notes (like lg_private.profile_notes including constraints including indexes) on commit drop;
 insert into qa_restore_notes select * from jsonb_populate_recordset(null::lg_private.profile_notes,b->'private_notes');
 if exists(select 1 from qa_restore_notes n left join qa_restore_profiles p on p.id=n.profile_id where p.id is null) then raise exception 'Restored note orphan'; end if;
end $$;
set local role anon;
do $$ begin
 begin
  if exists(select 1 from public.profiles) or exists(select 1 from public.training_plans) then raise exception 'Anonymous data access'; end if;
 exception when insufficient_privilege then null; end;
 begin perform public.export_system_backup(); raise exception 'Anon backup allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: active/inactive trainer and student; private notes; no metadata escalation; consumed allowlist; PDF update; anonymous denial; 17-table temporary restore and FK consistency' as qa;
rollback;
