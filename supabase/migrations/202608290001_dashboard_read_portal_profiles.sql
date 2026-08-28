-- Let authenticated Dashboard Manager accounts list registered Portal users.
-- Portal's existing policies continue to govern Portal users themselves.
begin;

alter table public.portal_profile enable row level security;

drop policy if exists "Dashboard managers can read portal profiles"
  on public.portal_profile;
create policy "Dashboard managers can read portal profiles"
  on public.portal_profile
  for select
  to authenticated
  using (public.is_dashboard_manager());

grant select on public.portal_profile to authenticated;

commit;
