-- Local development only (not for staging or production).

-- Send SMS hook (supabase/config.toml): writes the sign-in code to the
-- database log instead of sending an SMS. Read it with:
--   docker logs supabase_db_sar-ai 2>&1 | grep "SMS code"
-- The numbers in [auth.sms.test_otp] skip this and use their fixed codes.
create or replace function public.dev_send_sms(event jsonb)
returns jsonb
language plpgsql
as $$
begin
  raise log 'SMS code for %: %', event -> 'user' ->> 'phone', event -> 'sms' ->> 'otp';
  return '{}'::jsonb;
end;
$$;
grant execute on function public.dev_send_sms(jsonb) to supabase_auth_admin;
revoke execute on function public.dev_send_sms(jsonb) from public, anon, authenticated;
