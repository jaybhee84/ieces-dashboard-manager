begin;

alter table public.dashboard_profiles add column if not exists username text;
create unique index if not exists dashboard_profiles_username_key
  on public.dashboard_profiles (lower(username)) where username is not null;
alter table public.dashboard_profiles alter column role set default 'manager';

insert into public.dashboard_allowed_users (email, added_by)
values ('jaybhee84@gmail.com', 'creator setup')
on conflict (email) do nothing;

update public.dashboard_profiles
set username = 'admin', role = 'owner'
where lower(email) = 'jaybhee84@gmail.com';

create or replace function public.dashboard_login_email(candidate_username text)
returns text language sql stable security definer set search_path = public
as $$
  select email from public.dashboard_profiles
  where lower(username) = lower(trim(candidate_username)) limit 1;
$$;
revoke all on function public.dashboard_login_email(text) from public;
grant execute on function public.dashboard_login_email(text) to anon, authenticated;

create or replace function public.is_dashboard_manager()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.dashboard_profiles
    where user_id = auth.uid() and role in ('owner', 'manager')
  );
$$;

commit;
