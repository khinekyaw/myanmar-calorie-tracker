-- Sync for the offline-first app (docs/OFFLINE.md → "How sync works").
--
-- Two calls, both running as the signed-in user (row-level security applies):
--   sync_push(changes) — upload phone changes; newest `updated_at` wins.
--   sync_pull(since, after) — download rows written since the last pull.
-- One round trip each, because the app runs on slow mobile data.

-- A meal as the phone wants it: the log plus its items in order.
create function private.food_log_json(f public.food_logs)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', f.id,
    'eaten_at', f.eaten_at,
    'source', f.source,
    'status', f.status,
    'photo_path', f.photo_path,
    'is_shared_meal', f.is_shared_meal,
    'confidence', f.confidence,
    'candidates', f.candidates,
    'updated_at', f.updated_at,
    'deleted_at', f.deleted_at,
    'synced_at', f.synced_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object('dish_id', i.dish_id, 'qty', i.qty, 'oil', i.oil, 'sweetness', i.sweetness)
        order by i.position
      )
      from public.log_items i
      where i.user_id = f.user_id and i.log_id = f.id
    ), '[]'::jsonb)
  );
$$;

create function private.weight_json(w public.weights)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'day', w.day,
    'weight_kg', w.weight_kg,
    'waist_cm', w.waist_cm,
    'updated_at', w.updated_at,
    'deleted_at', w.deleted_at,
    'synced_at', w.synced_at
  );
$$;

create function private.profile_json(p public.profiles)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select to_jsonb(p) - 'user_id' - 'created_at';
$$;

-- A signed-in token stays valid for up to an hour after its account is
-- deleted (from another phone, or by support). The phone checks this so it can
-- start a new account at once instead of syncing into nothing.
create function private.account_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where id = auth.uid());
$$;

grant usage on schema private to authenticated;
revoke execute on function private.account_exists() from public;
grant execute on function private.account_exists() to authenticated;
grant execute on function private.food_log_json(public.food_logs),
  private.weight_json(public.weights),
  private.profile_json(public.profiles) to authenticated;

-- ── Push ───────────────────────────────────────────────────────────────────
--
-- changes = {
--   profile?:   { ...profiles columns, updated_at },
--   food_logs?: [{ id, eaten_at, source, status, photo_path, is_shared_meal, confidence,
--                  candidates, updated_at, deleted_at, items: [{ dish_id, qty, oil, sweetness }] }],
--   weights?:   [{ day, weight_kg, waist_cm, updated_at, deleted_at }]
-- }
--
-- Returns { rejected, profile, food_logs, weights }:
--   rejected — rows the server refused (bad data), so one bad row never blocks
--              the rest; the phone drops them from its outbox and logs them.
--   others   — the server's copy of rows where the server was newer, so the
--              phone catches up even when its clock was behind.
create function public.sync_push(changes jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '20s'
as $$
declare
  uid uuid := auth.uid();
  -- A phone clock running ahead must not win every future conflict.
  latest timestamptz := now() + interval '5 minutes';
  rejected jsonb := '[]'::jsonb;
  stale_logs uuid[] := '{}';
  stale_days date[] := '{}';
  stale_profile boolean := false;
  p jsonb;
  item jsonb;
  written boolean;
begin
  if uid is null or not private.account_exists() then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  if jsonb_typeof(coalesce(changes, '{}'::jsonb)) <> 'object'
    or jsonb_array_length(coalesce(changes -> 'food_logs', '[]'::jsonb)) > 200
    or jsonb_array_length(coalesce(changes -> 'weights', '[]'::jsonb)) > 500 then
    raise exception 'push at most 200 meals and 500 weights at a time' using errcode = '54000';
  end if;

  -- Profile
  if jsonb_typeof(changes -> 'profile') = 'object' then
    p := changes -> 'profile';
    begin
      written := null;
      insert into public.profiles as cur (
        user_id, onboarded, sex, birth_year, height_cm, weight_kg, workday, goal,
        target_weight_kg, pace_kg_week, health_flags, eating_places, language,
        uposatha_vegetarian, kcal_target, rice_plates_target, protein_g_target,
        fat_g_target, carb_g_target, updated_at
      ) values (
        uid,
        coalesce((p ->> 'onboarded')::boolean, false),
        p ->> 'sex',
        (p ->> 'birth_year')::smallint,
        (p ->> 'height_cm')::numeric,
        (p ->> 'weight_kg')::numeric,
        p ->> 'workday',
        p ->> 'goal',
        (p ->> 'target_weight_kg')::numeric,
        (p ->> 'pace_kg_week')::numeric,
        coalesce(array(select jsonb_array_elements_text(p -> 'health_flags')), '{}'),
        coalesce(array(select jsonb_array_elements_text(p -> 'eating_places')), '{}'),
        coalesce(p ->> 'language', 'my'),
        coalesce((p ->> 'uposatha_vegetarian')::boolean, true),
        (p ->> 'kcal_target')::integer,
        (p ->> 'rice_plates_target')::numeric,
        (p ->> 'protein_g_target')::integer,
        (p ->> 'fat_g_target')::integer,
        (p ->> 'carb_g_target')::integer,
        least((p ->> 'updated_at')::timestamptz, latest)
      )
      on conflict (user_id) do update set
        onboarded = excluded.onboarded,
        sex = excluded.sex,
        birth_year = excluded.birth_year,
        height_cm = excluded.height_cm,
        weight_kg = excluded.weight_kg,
        workday = excluded.workday,
        goal = excluded.goal,
        target_weight_kg = excluded.target_weight_kg,
        pace_kg_week = excluded.pace_kg_week,
        health_flags = excluded.health_flags,
        eating_places = excluded.eating_places,
        language = excluded.language,
        uposatha_vegetarian = excluded.uposatha_vegetarian,
        kcal_target = excluded.kcal_target,
        rice_plates_target = excluded.rice_plates_target,
        protein_g_target = excluded.protein_g_target,
        fat_g_target = excluded.fat_g_target,
        carb_g_target = excluded.carb_g_target,
        updated_at = excluded.updated_at
      where cur.updated_at < excluded.updated_at
      returning true into written;
      stale_profile := written is null;
    exception when others then
      rejected := rejected || jsonb_build_object('entity', 'profile', 'id', 'me', 'error', sqlerrm);
    end;
  end if;

  -- Meals (log + items as one unit)
  for p in select value from jsonb_array_elements(coalesce(changes -> 'food_logs', '[]'::jsonb))
  loop
    begin
      written := null;
      insert into public.food_logs as cur (
        user_id, id, eaten_at, source, status, photo_path, is_shared_meal,
        confidence, candidates, updated_at, deleted_at
      ) values (
        uid,
        (p ->> 'id')::uuid,
        (p ->> 'eaten_at')::timestamptz,
        p ->> 'source',
        p ->> 'status',
        p ->> 'photo_path',
        coalesce((p ->> 'is_shared_meal')::boolean, false),
        (p ->> 'confidence')::real,
        case when jsonb_typeof(p -> 'candidates') = 'array' then p -> 'candidates' end,
        least((p ->> 'updated_at')::timestamptz, latest),
        (p ->> 'deleted_at')::timestamptz
      )
      on conflict (user_id, id) do update set
        eaten_at = excluded.eaten_at,
        source = excluded.source,
        status = excluded.status,
        photo_path = coalesce(excluded.photo_path, cur.photo_path),
        is_shared_meal = excluded.is_shared_meal,
        confidence = excluded.confidence,
        candidates = excluded.candidates,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
      where cur.updated_at < excluded.updated_at
      returning true into written;

      if written then
        delete from public.log_items where user_id = uid and log_id = (p ->> 'id')::uuid;
        insert into public.log_items (user_id, log_id, position, dish_id, qty, oil, sweetness)
        select uid, (p ->> 'id')::uuid, (t.ord - 1)::smallint, t.it ->> 'dish_id',
          (t.it ->> 'qty')::numeric, t.it ->> 'oil', t.it ->> 'sweetness'
        from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) with ordinality as t (it, ord);
      else
        stale_logs := stale_logs || (p ->> 'id')::uuid;
      end if;
    exception when others then
      rejected := rejected || jsonb_build_object('entity', 'food_log', 'id', p ->> 'id', 'error', sqlerrm);
    end;
  end loop;

  -- Weights
  for p in select value from jsonb_array_elements(coalesce(changes -> 'weights', '[]'::jsonb))
  loop
    begin
      written := null;
      insert into public.weights as cur (user_id, day, weight_kg, waist_cm, updated_at, deleted_at)
      values (
        uid,
        (p ->> 'day')::date,
        (p ->> 'weight_kg')::numeric,
        (p ->> 'waist_cm')::numeric,
        least((p ->> 'updated_at')::timestamptz, latest),
        (p ->> 'deleted_at')::timestamptz
      )
      on conflict (user_id, day) do update set
        weight_kg = excluded.weight_kg,
        waist_cm = excluded.waist_cm,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
      where cur.updated_at < excluded.updated_at
      returning true into written;
      if written is null then
        stale_days := stale_days || (p ->> 'day')::date;
      end if;
    exception when others then
      rejected := rejected || jsonb_build_object('entity', 'weight', 'id', p ->> 'day', 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object(
    'rejected', rejected,
    'profile', (
      select private.profile_json(pr) from public.profiles pr
      where stale_profile and pr.user_id = uid
    ),
    'food_logs', (
      select coalesce(jsonb_agg(private.food_log_json(f)), '[]'::jsonb) from public.food_logs f
      where f.user_id = uid and f.id = any (stale_logs)
    ),
    'weights', (
      select coalesce(jsonb_agg(private.weight_json(w)), '[]'::jsonb) from public.weights w
      where w.user_id = uid and w.day = any (stale_days)
    )
  );
end;
$$;

-- ── Pull ───────────────────────────────────────────────────────────────────
--
-- since — the `cursor` returned by the previous complete pull (null = everything).
-- after — null for the first page; then the `next` keys returned for each list
--         that had more rows, e.g. { "food_logs": { "synced_at": ..., "id": ... } }.
--         Lists not named in `after` are skipped on later pages.
--
-- Returns { cursor, profile, passes, scans_used_today, food_logs, weights, dishes }
-- where each list is { rows, next } and next is null on the last page. The
-- phone stores `cursor` only after the last page has been applied.
create function public.sync_pull(since timestamptz default null, after jsonb default null, page_size integer default 500)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
set statement_timeout = '20s'
as $$
declare
  uid uuid := auth.uid();
  lim integer := least(greatest(coalesce(page_size, 500), 1), 1000);
  -- A row written by a transaction that was still open during the previous
  -- pull carries an earlier `synced_at` than that pull's cursor. Re-reading a
  -- short window (far longer than any write may take; see statement_timeout)
  -- catches it. Rows read twice are harmless: applying them is idempotent.
  from_ts timestamptz := coalesce(since - interval '2 minutes', '-infinity'::timestamptz);
  first_page boolean := after is null;
  result jsonb := jsonb_build_object('cursor', now());
  rows jsonb;
  n integer;
  k jsonb;
begin
  if uid is null or not private.account_exists() then
    raise exception 'sign in first' using errcode = '28000';
  end if;

  if first_page then
    result := result || jsonb_build_object(
      'profile', (
        select private.profile_json(p) from public.profiles p
        where p.user_id = uid and p.synced_at > from_ts
      ),
      'passes', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', p.id, 'plan', p.plan, 'starts_at', p.starts_at, 'ends_at', p.ends_at
        ) order by p.ends_at), '[]'::jsonb)
        from public.passes p where p.user_id = uid
      ),
      'scans_used_today', coalesce((
        select q.used from public.scan_quota q
        where q.user_id = uid and q.day = (now() at time zone 'Asia/Yangon')::date
      ), 0)
    );
  end if;

  if first_page or after ? 'food_logs' then
    k := after -> 'food_logs';
    select coalesce(jsonb_agg(private.food_log_json(page.f) order by (page.f).synced_at, (page.f).id), '[]'::jsonb),
      count(*)
    into rows, n
    from (
      select f from public.food_logs f
      where f.user_id = uid and f.synced_at > from_ts
        and (k is null or (f.synced_at, f.id) > ((k ->> 'synced_at')::timestamptz, (k ->> 'id')::uuid))
      order by f.synced_at, f.id
      limit lim
    ) page;
    result := result || jsonb_build_object('food_logs', jsonb_build_object(
      'rows', rows,
      'next', case when n = lim then jsonb_build_object(
        'synced_at', rows -> -1 -> 'synced_at', 'id', rows -> -1 -> 'id') end
    ));
  end if;

  if first_page or after ? 'weights' then
    k := after -> 'weights';
    select coalesce(jsonb_agg(private.weight_json(page.w) order by (page.w).synced_at, (page.w).day), '[]'::jsonb),
      count(*)
    into rows, n
    from (
      select w from public.weights w
      where w.user_id = uid and w.synced_at > from_ts
        and (k is null or (w.synced_at, w.day) > ((k ->> 'synced_at')::timestamptz, (k ->> 'day')::date))
      order by w.synced_at, w.day
      limit lim
    ) page;
    result := result || jsonb_build_object('weights', jsonb_build_object(
      'rows', rows,
      'next', case when n = lim then jsonb_build_object(
        'synced_at', rows -> -1 -> 'synced_at', 'day', rows -> -1 -> 'day') end
    ));
  end if;

  -- Dish catalogue: everyone's, paged by the server's own `updated_at`.
  if first_page or after ? 'dishes' then
    k := after -> 'dishes';
    select coalesce(jsonb_agg(to_jsonb(page.d) - 'created_at' order by (page.d).updated_at, (page.d).id), '[]'::jsonb),
      count(*)
    into rows, n
    from (
      select d from public.dishes d
      where d.updated_at > from_ts
        and (k is null or (d.updated_at, d.id) > ((k ->> 'updated_at')::timestamptz, k ->> 'id'))
      order by d.updated_at, d.id
      limit lim
    ) page;
    result := result || jsonb_build_object('dishes', jsonb_build_object(
      'rows', rows,
      'next', case when n = lim then jsonb_build_object(
        'updated_at', rows -> -1 -> 'updated_at', 'id', rows -> -1 -> 'id') end
    ));
  end if;

  return result;
end;
$$;

revoke execute on function public.sync_push(jsonb) from public, anon;
revoke execute on function public.sync_pull(timestamptz, jsonb, integer) from public, anon;
grant execute on function public.sync_push(jsonb) to authenticated;
grant execute on function public.sync_pull(timestamptz, jsonb, integer) to authenticated;
