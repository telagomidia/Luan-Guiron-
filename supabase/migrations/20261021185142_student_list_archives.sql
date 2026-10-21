-- Presentation state only: hiding never changes the student's account or billing.
create table public.student_list_archives (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  hidden_until timestamptz not null,
  constraint student_archive_period check (
    hidden_until > hidden_at and hidden_until <= hidden_at + interval '3650 days'
  )
);
alter table public.student_list_archives enable row level security;
revoke all on public.student_list_archives from public, anon;
grant select, insert, update, delete on public.student_list_archives to authenticated;
grant all on public.student_list_archives to service_role;
create policy trainer_manage_student_archives on public.student_list_archives
for all to authenticated
using ((select public.is_trainer()))
with check (
  (select public.is_trainer()) and exists (
    select 1 from public.profiles p
    where p.id = student_id and p.role = 'student'
  )
);

create function public.archive_student_for_days(p_student_id uuid, p_days integer)
returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare deadline timestamptz;
begin
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'Escolha de 1 a 3650 dias.';
  end if;
  insert into public.student_list_archives(student_id, hidden_at, hidden_until)
  values (p_student_id, now(), now() + make_interval(days => p_days))
  on conflict (student_id) do update
    set hidden_at = excluded.hidden_at, hidden_until = excluded.hidden_until
  returning hidden_until into deadline;
  return deadline;
end;
$$;
revoke all on function public.archive_student_for_days(uuid, integer) from public, anon;
grant execute on function public.archive_student_for_days(uuid, integer) to authenticated;
