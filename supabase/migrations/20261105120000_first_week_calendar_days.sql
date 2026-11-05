-- The first week of free scans counts Myanmar calendar days, like the app
-- (store/scanQuota.ts): days 0–6 after sign-up get the higher allowance, from
-- day 7 the lower one. Before, it was 7 × 24 hours from sign-up, so on day 7
-- the server still gave the higher allowance until the hour of sign-up while
-- the app already showed the lower one.
create or replace function public.free_scans_per_day(p_user uuid, p_first_week integer, p_after integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (now() at time zone 'Asia/Yangon')::date
       - ((select u.created_at from auth.users u where u.id = p_user) at time zone 'Asia/Yangon')::date < 7
      then p_first_week
    else p_after
  end;
$$;
