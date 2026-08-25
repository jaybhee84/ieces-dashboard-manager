begin;

-- The owner uses one Supabase Auth identity across every managed application.
-- No password is stored here; authentication remains entirely in Supabase Auth.
insert into public.report_allowed_users (email, added_by)
values ('jaybhee84@gmail.com', 'system owner') on conflict (email) do nothing;
insert into public.portal_allowed_users (email, added_by)
values ('jaybhee84@gmail.com', 'system owner') on conflict (email) do nothing;
insert into public.news_allowed_users (email, added_by)
values ('jaybhee84@gmail.com', 'system owner') on conflict (email) do nothing;
insert into public.bmi_allowed_users (email, added_by)
values ('jaybhee84@gmail.com', 'system owner') on conflict (email) do nothing;

create or replace function public.is_dashboard_owner()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.dashboard_profiles
    where user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.is_dashboard_owner_user(candidate_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.dashboard_profiles
    where user_id = candidate_user_id and role = 'owner'
  );
$$;

create or replace function public.ensure_owner_app_access(app_key text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  owner_email constant text := 'jaybhee84@gmail.com';
  signed_in_email text;
begin
  select lower(email) into signed_in_email from auth.users where id = auth.uid();
  if signed_in_email is distinct from owner_email or not public.is_dashboard_owner() then
    return false;
  end if;

  case lower(trim(app_key))
    when 'report' then
      insert into public.profiles
        (id, email, username, family_name, first_name, middle_initial, app_source)
      values
        (auth.uid(), owner_email, 'owner.jaybhee84', 'BAZAN', 'JONYBHEE', 'A', 'owner')
      on conflict (id) do update set email = excluded.email, app_source = 'owner';
    when 'news' then
      insert into public.profiles
        (id, email, username, family_name, first_name, middle_initial, app_source)
      values
        (auth.uid(), owner_email, 'owner.jaybhee84', 'BAZAN', 'JONYBHEE', 'A', 'owner')
      on conflict (id) do update set email = excluded.email, app_source = 'owner';
    when 'portal' then
      insert into public.portal_profile
        (id, email, username, family_name, first_name, middle_initial, role)
      values
        (auth.uid(), owner_email, 'owner.jaybhee84', 'BAZAN', 'JONYBHEE', 'A', 'admin')
      on conflict (id) do update set email = excluded.email, role = 'admin';
    when 'bmi' then
      insert into public.bmi_profiles
        (id, username, email, lastname, firstname, middleinitial, fullname, role, position)
      values
        (auth.uid(), 'owner.jaybhee84', owner_email, 'BAZAN', 'JONYBHEE', 'A', 'JONYBHEE A. BAZAN', 'division', 'System Owner')
      on conflict (id) do update set email = excluded.email, role = 'division', position = 'System Owner';
    else
      raise exception 'Unknown application';
  end case;

  return true;
end;
$$;

revoke all on function public.is_dashboard_owner() from public, anon;
grant execute on function public.is_dashboard_owner() to authenticated;
revoke all on function public.is_dashboard_owner_user(uuid) from public, anon;
grant execute on function public.is_dashboard_owner_user(uuid) to authenticated;
revoke all on function public.ensure_owner_app_access(text) from public, anon;
grant execute on function public.ensure_owner_app_access(text) to authenticated;

-- Managers may administer ordinary entries, but the owner entry is immutable
-- unless the signed-in user is the owner.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'dashboard_allowed_users', 'report_allowed_users', 'portal_allowed_users',
    'news_allowed_users', 'bmi_allowed_users'
  ] loop
    execute format('drop policy if exists "Dashboard managers can manage %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "authenticated manage allowed_users" on public.%1$I', table_name);
    execute format('drop policy if exists "Dashboard team manages %1$s" on public.%1$I', table_name);
    execute format(
      'create policy "Dashboard team manages %1$s" on public.%1$I for all to authenticated using (public.is_dashboard_manager() and (lower(email) <> %2$L or public.is_dashboard_owner())) with check (public.is_dashboard_manager() and (lower(email) <> %2$L or public.is_dashboard_owner()))',
      table_name, 'jaybhee84@gmail.com'
    );
  end loop;
end $$;

-- Managers can monitor app users, but the owner's live status is visible only
-- to the owner. Each user may still maintain their own presence row.
drop policy if exists "Authenticated users can read presence" on public.user_presence;
drop policy if exists "Dashboard owner can read presence" on public.user_presence;
drop policy if exists "Dashboard team can read presence" on public.user_presence;
create policy "Dashboard team can read presence" on public.user_presence
for select to authenticated using (
  user_id = auth.uid()
  or public.is_dashboard_owner()
  or (
    public.is_dashboard_manager()
    and not public.is_dashboard_owner_user(user_presence.user_id)
  )
);

commit;
