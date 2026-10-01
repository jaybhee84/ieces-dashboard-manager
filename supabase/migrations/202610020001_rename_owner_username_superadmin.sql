begin;

update public.dashboard_profiles
set username = 'superadmin', role = 'owner'
where lower(email) = 'jaybhee84@gmail.com';

commit;
