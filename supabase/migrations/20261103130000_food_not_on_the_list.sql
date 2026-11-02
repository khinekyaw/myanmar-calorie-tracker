-- Food that isn't on the dish list (docs/CATALOGUE.md → "What's missing").
--
-- 1. log_items.custom: a food the scan saw that isn't in the catalogue, with
--    its name and estimated numbers for one unit. dish_id is then the closest
--    "Other …" dish (dishes.source = 'generic').
-- 2. search_misses: searches that found nothing, sent by the phone with sync.
-- 3. catalogue_misses: both, plus unknown foods in scan answers, counted for
--    the team (service role / Studio only).
-- sync_push and food_log_json are replaced to carry the new data.

create function private.valid_custom_food(c jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(c) = 'object'
    and jsonb_typeof(c -> 'name_en') = 'string' and length(c ->> 'name_en') between 1 and 80
    and jsonb_typeof(c -> 'name_my') = 'string' and length(c ->> 'name_my') <= 80
    and jsonb_typeof(c -> 'kcal') = 'number' and (c ->> 'kcal')::numeric between 0 and 3000
    and jsonb_typeof(c -> 'carb_g') = 'number' and (c ->> 'carb_g')::numeric between 0 and 500
    and jsonb_typeof(c -> 'protein_g') = 'number' and (c ->> 'protein_g')::numeric between 0 and 300
    and jsonb_typeof(c -> 'fat_g') = 'number' and (c ->> 'fat_g')::numeric between 0 and 300;
$$;

revoke execute on function private.valid_custom_food(jsonb) from public;
grant execute on function private.valid_custom_food(jsonb) to authenticated, service_role;

alter table public.log_items
  add column custom jsonb check (custom is null or private.valid_custom_food(custom));

create table public.search_misses (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  query text not null check (length(query) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.search_misses enable row level security;
-- The phone only adds; nobody reads them back through the API.
create policy "search_misses: insert own" on public.search_misses for insert to authenticated
  with check (user_id = (select auth.uid()));
revoke all on public.search_misses from anon, authenticated;
grant insert on public.search_misses to authenticated;
grant all on public.search_misses to service_role;

-- What people eat that the list doesn't have, most asked first.
create view public.catalogue_misses with (security_invoker = true) as
  select 'search' as kind, lower(trim(query)) as food, count(*) as times,
    count(distinct user_id) as people, max(created_at) as last_seen
  from public.search_misses
  group by 2
  union all
  select 'scan', lower(trim(it ->> 'name')), count(*), count(distinct s.user_id), max(s.updated_at)
  from public.scans s, jsonb_array_elements(s.response -> 'items') it
  where s.status = 'done' and it ->> 'dish_id' is null and coalesce(it ->> 'name', '') <> ''
  group by 2;

revoke all on public.catalogue_misses from anon, authenticated;
grant select on public.catalogue_misses to service_role;

create or replace function private.food_log_json(f public.food_logs)
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
        jsonb_build_object(
          'dish_id', i.dish_id, 'qty', i.qty, 'oil', i.oil, 'sweetness', i.sweetness, 'custom', i.custom
        )
        order by i.position
      )
      from public.log_items i
      where i.user_id = f.user_id and i.log_id = f.id
    ), '[]'::jsonb)
  );
$$;

create or replace function public.sync_push(changes jsonb)
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
    or jsonb_array_length(coalesce(changes -> 'weights', '[]'::jsonb)) > 500
    or jsonb_array_length(coalesce(changes -> 'search_misses', '[]'::jsonb)) > 200 then
    raise exception 'push at most 200 meals, 500 weights and 200 searches at a time' using errcode = '54000';
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
        insert into public.log_items (user_id, log_id, position, dish_id, qty, oil, sweetness, custom)
        select uid, (p ->> 'id')::uuid, (t.ord - 1)::smallint, t.it ->> 'dish_id',
          (t.it ->> 'qty')::numeric, t.it ->> 'oil', t.it ->> 'sweetness',
          case when jsonb_typeof(t.it -> 'custom') = 'object' then t.it -> 'custom' end
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

  -- Searches that found nothing: insert-only, sent once.
  for p in select value from jsonb_array_elements(coalesce(changes -> 'search_misses', '[]'::jsonb))
  loop
    begin
      insert into public.search_misses (user_id, id, query, created_at)
      values (uid, (p ->> 'id')::uuid, p ->> 'query', least((p ->> 'created_at')::timestamptz, latest))
      on conflict do nothing;
    exception when others then
      rejected := rejected || jsonb_build_object('entity', 'search_miss', 'id', p ->> 'id', 'error', sqlerrm);
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
