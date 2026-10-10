-- Apply as database owner. Transactional; never deletes students or training history.
begin;
create schema if not exists lg_private;
revoke all on schema lg_private from public, anon;
grant usage on schema lg_private to authenticated, service_role;

create or replace function lg_private.current_profile_role()
returns text language sql stable security definer set search_path = '' as $$
 select p.role::text from public.profiles p
 where p.id = (select auth.uid()) and p.active is true;
$$;
revoke all on function lg_private.current_profile_role() from public, anon;
grant execute on function lg_private.current_profile_role() to authenticated, service_role;
create or replace function public.is_trainer()
returns boolean language sql stable security invoker set search_path = '' as $$
 select coalesce(lg_private.current_profile_role() = 'trainer', false);
$$;
revoke all on function public.is_trainer() from public, anon;
grant execute on function public.is_trainer() to authenticated, service_role;

-- Restrictive guards supplement, rather than replace, ownership policies.
do $$ declare t text; begin
 foreach t in array array['exercise_library','assessments','circumferences','skinfolds',
 'strength_tests','vo2_tests','vo2_stages','anamneses','training_plans','workouts',
 'workout_exercises','workout_sessions','exercise_sets','guidance','progress_photos','student_followups'] loop
 execute format('drop policy if exists active_profile_guard on public.%I', t);
 execute format('create policy active_profile_guard on public.%I as restrictive for all to authenticated using ((select lg_private.current_profile_role()) is not null) with check ((select lg_private.current_profile_role()) is not null)', t);
 end loop;
end $$;
-- Keep self profile readable to explain deactivation; all clinical data is blocked.
drop policy if exists active_profile_guard on storage.objects;
create policy active_profile_guard on storage.objects as restrictive for all to authenticated
using (bucket_id not in ('progress-photos','assessment-docs','assessment-documents') or (select lg_private.current_profile_role()) is not null)
with check (bucket_id not in ('progress-photos','assessment-docs','assessment-documents') or (select lg_private.current_profile_role()) is not null);
alter policy "trainer file update" on storage.objects
with check (bucket_id in ('progress-photos','assessment-docs') and (select public.is_trainer()));
alter policy "trainer assessment documents insert" on storage.objects
with check (bucket_id = 'assessment-documents' and (select public.is_trainer()));
alter policy "trainer assessment documents select" on storage.objects
using (bucket_id = 'assessment-documents' and (select public.is_trainer()));
drop policy if exists "trainer assessment documents update" on storage.objects;
create policy "trainer assessment documents update" on storage.objects for update to authenticated
using (bucket_id = 'assessment-documents' and (select public.is_trainer()))
with check (bucket_id = 'assessment-documents' and (select public.is_trainer()));
drop policy if exists "trainer assessment documents delete" on storage.objects;
create policy "trainer assessment documents delete" on storage.objects for delete to authenticated
using (bucket_id = 'assessment-documents' and (select public.is_trainer()));

-- The one-time allowlist is not an account reactivation mechanism.
create or replace function lg_private.claim_admin_profile()
returns public.app_role language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); e text; a public.admin_activation_allowlist%rowtype; r public.app_role;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 select lower(email) into e from auth.users where id=u and email_confirmed_at is not null;
 if e is null then raise exception 'email_not_verified'; end if;
 select * into a from public.admin_activation_allowlist where lower(email)=e for update;
 if not found or (a.claimed_by is not null and a.claimed_by<>u) then raise exception 'not_authorized'; end if;
 if a.claimed_by=u then
   select role into r from public.profiles where id=u and active is true and role=a.role;
   if r is null then raise exception 'account_inactive_or_claim_consumed'; end if;
   return r;
 end if;
 insert into public.profiles(id,role,full_name,email,active) values(u,a.role,a.full_name,e,true)
 on conflict(id) do update set role=excluded.role,full_name=excluded.full_name,email=excluded.email,active=true;
 update public.admin_activation_allowlist set claimed_by=u,claimed_at=now() where email=a.email;
 return a.role;
end $$;
revoke all on function lg_private.claim_admin_profile() from public, anon;
grant execute on function lg_private.claim_admin_profile() to authenticated, service_role;
create or replace function public.claim_admin_profile()
returns public.app_role language sql security invoker set search_path = '' as $$
 select lg_private.claim_admin_profile();
$$;
revoke all on function public.claim_admin_profile() from public, anon;
grant execute on function public.claim_admin_profile() to authenticated, service_role;

-- Preserve existing private notes, removing them from the student's public profile.
create table if not exists lg_private.profile_notes (
 profile_id uuid primary key references public.profiles(id) on delete cascade deferrable initially deferred,
 observations text not null,
 updated_at timestamptz not null default now()
);
alter table lg_private.profile_notes enable row level security;
revoke all on lg_private.profile_notes from public, anon, authenticated;
grant select on lg_private.profile_notes to authenticated;
grant all on lg_private.profile_notes to service_role;
drop policy if exists trainer_read on lg_private.profile_notes;
create policy trainer_read on lg_private.profile_notes for select to authenticated using ((select public.is_trainer()));
-- Re-applying this script is safe: temporarily disable only our trigger.
drop trigger if exists protect_profile_notes on public.profiles;
insert into lg_private.profile_notes(profile_id,observations)
select id,observations from public.profiles where nullif(trim(observations),'') is not null
on conflict(profile_id) do update set observations=excluded.observations,updated_at=now();
update public.profiles set observations=null where observations is not null;
create or replace function lg_private.protect_profile_notes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.observations is not null and auth.uid() is not null and not public.is_trainer() then
   raise exception 'not_authorized';
 end if;
 if nullif(trim(new.observations),'') is null then
   delete from lg_private.profile_notes where profile_id=new.id;
 else
   insert into lg_private.profile_notes(profile_id,observations) values(new.id,new.observations)
   on conflict(profile_id) do update set observations=excluded.observations,updated_at=now();
 end if;
 new.observations:=null;
 return new;
end $$;
revoke all on function lg_private.protect_profile_notes() from public, anon, authenticated;
create trigger protect_profile_notes before insert or update of observations on public.profiles
for each row execute function lg_private.protect_profile_notes();
create or replace function public.get_trainer_profile_notes()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
 if not public.is_trainer() then raise exception 'not_authorized'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('profile_id',profile_id,'observations',observations)) from lg_private.profile_notes),'[]'::jsonb);
end $$;
revoke all on function public.get_trainer_profile_notes() from public, anon;
grant execute on function public.get_trainer_profile_notes() to authenticated, service_role;

-- App snapshot only, not Auth credentials or infrastructure; STABLE uses one MVCC snapshot.
create or replace function public.export_system_backup()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare t text; rows jsonb; tables jsonb := '{}'::jsonb; result jsonb; n bigint;
begin
 if not public.is_trainer() then raise exception 'not_authorized'; end if;
 foreach t in array array['profiles','exercise_library','assessments','circumferences','skinfolds',
 'strength_tests','vo2_tests','vo2_stages','anamneses','training_plans','workouts',
 'workout_exercises','workout_sessions','exercise_sets','guidance','progress_photos','student_followups'] loop
   execute format('select count(*) from public.%I',t) into n;
   if n>100000 then raise exception 'backup_table_too_large'; end if;
   execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from public.%I r',t) into rows;
   tables:=tables || jsonb_build_object(t,rows);
 end loop;
 result:=jsonb_build_object('format','lg-system-snapshot','version',1,'project_ref','ziunjhebdkqdmvsrjxhm',
   'created_at',now(),'tables',tables,'private_notes',coalesce((select jsonb_agg(to_jsonb(p)) from lg_private.profile_notes p),'[]'::jsonb),
   'storage_files',coalesce((select jsonb_agg(jsonb_build_object('bucket_id',bucket_id,'name',name,'metadata',metadata,'updated_at',updated_at) order by bucket_id,name)
     from storage.objects where bucket_id in ('progress-photos','assessment-docs','assessment-documents')),'[]'::jsonb));
 if octet_length(result::text)>20971520 then raise exception 'backup_payload_too_large'; end if;
 return result;
end $$;
revoke all on function public.export_system_backup() from public, anon;
grant execute on function public.export_system_backup() to authenticated, service_role;
commit;
