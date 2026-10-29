-- Photo-scan quota and Premium passes. These functions are for the service
-- role only (Edge Functions): the app can never grant itself scans or Premium.

create function private.has_pass(p_user uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.passes
    where user_id = p_user and starts_at <= now() and ends_at > now()
  );
$$;

create function private.scans_left(p_user uuid, p_free_per_day integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when private.has_pass(p_user) then null else greatest(p_free_per_day - coalesce((
    select used from public.scan_quota
    where user_id = p_user and day = (now() at time zone 'Asia/Yangon')::date
  ), 0), 0) end;
$$;

-- Start (or retry) the scan of one photo. Returns { outcome, scans_left, response? }:
--   go               — call the vision model, then finish_scan()
--   cached           — this photo was already scanned; `response` is the answer
--   in_progress      — another request is scanning it right now
--   quota_exceeded   — no free scans left (and no pass)
--   budget_exceeded  — the service-wide daily AI budget is used up
--
-- Free scans are counted on the day the photo was taken (Myanmar time), so a
-- photo queued offline yesterday uses yesterday's scans; if that day is full,
-- today's are used. Days more than 2 days back count as today.
create function public.begin_scan(
  p_user uuid,
  p_log_id uuid,
  p_photo_path text,
  p_taken_at timestamptz,
  p_free_per_day integer,
  p_daily_budget_usd numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.scans;
  fresh boolean;
  today date := (now() at time zone 'Asia/Yangon')::date;
  taken date := case
    when p_taken_at between now() - interval '2 days' and now() then (p_taken_at at time zone 'Asia/Yangon')::date
    else today
  end;
  d date;
  used_now integer;
begin
  insert into public.scans (user_id, log_id, photo_path, status)
  values (p_user, p_log_id, p_photo_path, 'pending')
  on conflict (user_id, log_id) do nothing
  returning true into fresh;

  -- Serialises concurrent requests for the same photo.
  select * into s from public.scans where user_id = p_user and log_id = p_log_id for update;

  if s.status = 'done' then
    return jsonb_build_object('outcome', 'cached', 'response', s.response,
      'scans_left', private.scans_left(p_user, p_free_per_day));
  end if;
  if fresh is null and s.status = 'pending' and s.updated_at > now() - interval '2 minutes' then
    return jsonb_build_object('outcome', 'in_progress',
      'scans_left', private.scans_left(p_user, p_free_per_day));
  end if;

  if p_daily_budget_usd is not null and (
    select coalesce(sum(cost_usd), 0) from public.scans where updated_at > now() - interval '1 day'
  ) >= p_daily_budget_usd then
    update public.scans set status = 'failed', error = 'daily AI budget used up', updated_at = now()
    where user_id = p_user and log_id = p_log_id;
    return jsonb_build_object('outcome', 'budget_exceeded',
      'scans_left', private.scans_left(p_user, p_free_per_day));
  end if;

  -- A retry after a failure isn't charged again: the failure was refunded,
  -- and a crashed attempt (still charged) keeps its charge.
  if s.charged_day is null and not private.has_pass(p_user) then
    if p_free_per_day > 0 then
      foreach d in array (case when taken = today then array[today] else array[taken, today] end)
      loop
        used_now := null;
        insert into public.scan_quota as q (user_id, day, used) values (p_user, d, 1)
        on conflict (user_id, day) do update set used = q.used + 1
        where q.used < p_free_per_day
        returning q.used into used_now;
        if used_now is not null then
          s.charged_day := d;
          exit;
        end if;
      end loop;
    end if;
    if s.charged_day is null then
      update public.scans set status = 'failed', error = 'no free scans left', updated_at = now()
      where user_id = p_user and log_id = p_log_id;
      return jsonb_build_object('outcome', 'quota_exceeded', 'scans_left', 0);
    end if;
  end if;

  update public.scans set
    status = 'pending',
    photo_path = p_photo_path,
    charged_day = s.charged_day,
    attempts = case when fresh then 1 else s.attempts + 1 end,
    error = null,
    updated_at = now()
  where user_id = p_user and log_id = p_log_id;

  return jsonb_build_object('outcome', 'go', 'scans_left', private.scans_left(p_user, p_free_per_day));
end;
$$;

-- Record the result of a scan attempt. A failed attempt gives the free scan
-- back. Token counts and cost add up across attempts. Returns { scans_left }.
create function public.finish_scan(
  p_user uuid,
  p_log_id uuid,
  p_ok boolean,
  p_response jsonb,
  p_error text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cache_read_tokens integer,
  p_cache_write_tokens integer,
  p_cost_usd numeric,
  p_latency_ms integer,
  p_free_per_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.scans;
begin
  select * into s from public.scans where user_id = p_user and log_id = p_log_id for update;
  if not found then
    raise exception 'no scan for this photo' using errcode = 'P0002';
  end if;

  if not p_ok and s.charged_day is not null then
    update public.scan_quota set used = greatest(used - 1, 0)
    where user_id = p_user and day = s.charged_day;
  end if;

  update public.scans set
    status = case when p_ok then 'done' else 'failed' end,
    response = case when p_ok then p_response end,
    error = case when p_ok then null else left(p_error, 500) end,
    charged_day = case when p_ok then s.charged_day end,
    model = coalesce(p_model, s.model),
    input_tokens = coalesce(s.input_tokens, 0) + coalesce(p_input_tokens, 0),
    output_tokens = coalesce(s.output_tokens, 0) + coalesce(p_output_tokens, 0),
    cache_read_tokens = coalesce(s.cache_read_tokens, 0) + coalesce(p_cache_read_tokens, 0),
    cache_write_tokens = coalesce(s.cache_write_tokens, 0) + coalesce(p_cache_write_tokens, 0),
    cost_usd = coalesce(s.cost_usd, 0) + coalesce(p_cost_usd, 0),
    latency_ms = p_latency_ms,
    updated_at = now()
  where user_id = p_user and log_id = p_log_id;

  return jsonb_build_object('scans_left', private.scans_left(p_user, p_free_per_day));
end;
$$;

-- Grant a prepaid pass after a confirmed payment. Safe to call twice with the
-- same (provider, reference): the second call returns the first pass. A new
-- pass starts when the current one ends (passes extend; no auto-renew).
create function public.grant_pass(
  p_user uuid,
  p_plan text,
  p_provider text,
  p_ref text,
  p_amount_ks integer default null
)
returns public.passes
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.passes;
  created public.passes;
  starts timestamptz;
begin
  select * into existing from public.passes where payment_provider = p_provider and payment_ref = p_ref;
  if found then
    return existing;
  end if;

  -- One grant at a time per user, so two passes bought together chain correctly.
  perform pg_advisory_xact_lock(hashtextextended('grant_pass:' || p_user::text, 0));

  starts := greatest(now(), coalesce((select max(ends_at) from public.passes where user_id = p_user), now()));
  insert into public.passes (user_id, plan, starts_at, ends_at, payment_provider, payment_ref, amount_ks)
  values (
    p_user, p_plan, starts,
    starts + case p_plan when '1m' then interval '1 month' when '3m' then interval '3 months' end,
    p_provider, p_ref, p_amount_ks
  )
  on conflict (payment_provider, payment_ref) do nothing
  returning * into created;

  if created.id is null then
    select * into created from public.passes where payment_provider = p_provider and payment_ref = p_ref;
  end if;
  return created;
end;
$$;

revoke execute on function private.has_pass(uuid), private.scans_left(uuid, integer) from public;
revoke execute on function public.begin_scan(uuid, uuid, text, timestamptz, integer, numeric),
  public.finish_scan(uuid, uuid, boolean, jsonb, text, text, integer, integer, integer, integer, numeric, integer, integer),
  public.grant_pass(uuid, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.begin_scan(uuid, uuid, text, timestamptz, integer, numeric),
  public.finish_scan(uuid, uuid, boolean, jsonb, text, text, integer, integer, integer, integer, numeric, integer, integer),
  public.grant_pass(uuid, text, text, text, integer)
  to service_role;
