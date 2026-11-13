-- The original whitelist policy let anyone with the public key list every
-- approved email. Only signed-in owner pages and the service-role
-- dashboard-auth function read this table, so anon access is not needed.
drop policy if exists "anon read allowed_users" on public.dashboard_allowed_users;
