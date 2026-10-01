begin;

-- Account support for dashboard owners and managers. Every IECES app shares
-- this Supabase Auth project, so the fix applies to the user's login everywhere.
-- action: 'account_status' | 'set_password' | 'confirm_email' | 'set_disabled'
create or replace function public.dashboard_account_action(
  action text,
  target_user_id text default null,
  target_email text default null,
  new_password text default null,
  disable boolean default null
)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  owner_email constant text := 'jaybhee84@gmail.com';
  target auth.users%rowtype;
begin
  if not public.is_dashboard_manager() then
    raise exception 'Sign in as a dashboard administrator to manage accounts.'
      using errcode = '42501';
  end if;

  -- App profile tables do not all key on the auth user id, so fall back to
  -- the profile's email when the id does not match a login account.
  select * into target from auth.users where id::text = target_user_id;
  if target.id is null and nullif(trim(target_email), '') is not null then
    select * into target from auth.users
    where lower(email) = lower(trim(target_email)) limit 1;
  end if;
  if target.id is null then
    raise exception 'No login account was found for this user.';
  end if;

  if action <> 'account_status' then
    if lower(target.email) = owner_email and not public.is_dashboard_owner() then
      raise exception 'Only the system owner can change this account.'
        using errcode = '42501';
    end if;

    if action = 'set_password' then
      if length(coalesce(new_password, '')) < 8 then
        raise exception 'The temporary password needs at least 8 characters.';
      end if;
      update auth.users
      set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now()
      where id = target.id;
    elsif action = 'confirm_email' then
      update auth.users
      set email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
      where id = target.id;
    elsif action = 'set_disabled' then
      if disable and (target.id = auth.uid() or lower(target.email) = owner_email) then
        raise exception 'This account cannot be disabled.';
      end if;
      update auth.users
      set banned_until = case when disable then now() + interval '100 years' end,
          updated_at = now()
      where id = target.id;
    else
      raise exception 'Unknown account action.';
    end if;

    select * into target from auth.users where id = target.id;
  end if;

  return jsonb_build_object(
    'email', target.email,
    'created_at', target.created_at,
    'last_sign_in_at', target.last_sign_in_at,
    'email_confirmed', target.email_confirmed_at is not null,
    'disabled', coalesce(target.banned_until > now(), false)
  );
end;
$$;

revoke all on function public.dashboard_account_action(text, text, text, text, boolean)
  from public, anon;
grant execute on function public.dashboard_account_action(text, text, text, text, boolean)
  to authenticated;

commit;
