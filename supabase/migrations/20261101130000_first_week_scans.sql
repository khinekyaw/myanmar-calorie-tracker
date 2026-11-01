-- Free scans: more in the first week, fewer after (reports/Unit economics.md).
-- The scan Edge Function asks for the user's allowance today and passes it to
-- begin_scan / finish_scan as p_free_per_day. The week counts from the
-- account's creation, so a new phone signed in to an old account gets the
-- lower number.
create function public.free_scans_per_day(p_user uuid, p_first_week integer, p_after integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select u.created_at from auth.users u where u.id = p_user) > now() - interval '7 days' then p_first_week
    else p_after
  end;
$$;

revoke execute on function public.free_scans_per_day(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.free_scans_per_day(uuid, integer, integer) to service_role;
