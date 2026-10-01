begin;

-- Only the owner decides who may register a Dashboard Manager account.
-- Managers keep access to the per-app whitelists (report, portal, news).
drop policy if exists "Dashboard team manages dashboard_allowed_users"
  on public.dashboard_allowed_users;
drop policy if exists "Dashboard owner manages dashboard_allowed_users"
  on public.dashboard_allowed_users;
create policy "Dashboard owner manages dashboard_allowed_users"
  on public.dashboard_allowed_users for all to authenticated
  using (public.is_dashboard_owner())
  with check (public.is_dashboard_owner());

commit;
