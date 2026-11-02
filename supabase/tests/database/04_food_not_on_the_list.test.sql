-- Foods not on the dish list: custom items in meals, search misses, the misses report.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, aud, role) values
  ('cccccccc-0000-4000-8000-000000000007', 'authenticated', 'authenticated');

create function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('cccccccc-0000-4000-8000-000000000007');

-- A scanned meal with a food that isn't in the catalogue
select is(
  public.sync_push(jsonb_build_object(
    'food_logs', jsonb_build_array(jsonb_build_object(
      'id', 'c0000000-0000-4000-8000-000000000001', 'eaten_at', now(), 'source', 'photo', 'status', 'done',
      'updated_at', now(),
      'items', jsonb_build_array(
        jsonb_build_object('dish_id', 'rice', 'qty', 1),
        jsonb_build_object('dish_id', 'otherMeatCurry', 'qty', 2, 'custom', jsonb_build_object(
          'name_en', 'Pork leg stew', 'name_my', 'ဝက်ခြေထောက်ဟင်း',
          'kcal', 95, 'carb_g', 2, 'protein_g', 7, 'fat_g', 6.5))))),
    'search_misses', jsonb_build_array(
      jsonb_build_object('id', 'c1000000-0000-4000-8000-000000000001', 'query', 'wet khaw hin', 'created_at', now()))
  )) -> 'rejected',
  '[]'::jsonb,
  'a meal with an unknown food and a search miss are accepted'
);

select is(
  (select custom ->> 'name_en' from public.log_items where position = 1),
  'Pork leg stew',
  'the unknown food keeps its name and numbers'
);

select is(
  (select private.food_log_json(f) -> 'items' -> 1 -> 'custom' ->> 'kcal' from public.food_logs f),
  '95',
  'meals come back with the unknown food'
);

select is(
  jsonb_array_length(public.sync_push(jsonb_build_object(
    'food_logs', jsonb_build_array(jsonb_build_object(
      'id', 'c0000000-0000-4000-8000-000000000002', 'eaten_at', now(), 'source', 'photo', 'status', 'done',
      'updated_at', now(),
      'items', jsonb_build_array(jsonb_build_object('dish_id', 'otherMeatCurry', 'qty', 1, 'custom',
        jsonb_build_object('name_en', 'x', 'name_my', '', 'kcal', 99999, 'carb_g', 0, 'protein_g', 0, 'fat_g', 0)))))
  )) -> 'rejected'),
  1,
  'impossible numbers are refused'
);

select is(
  public.sync_push(jsonb_build_object('search_misses', jsonb_build_array(
    jsonb_build_object('id', 'c1000000-0000-4000-8000-000000000001', 'query', 'wet khaw hin', 'created_at', now()))
  )) -> 'rejected',
  '[]'::jsonb,
  'a search miss sent twice is kept once'
);

select throws_ok(
  $$ select * from public.search_misses $$,
  '42501', null, 'the app cannot read search misses'
);

select throws_ok(
  $$ select * from public.catalogue_misses $$,
  '42501', null, 'the app cannot read the misses report'
);

reset role;
set local role service_role;
select is((select count(*)::int from public.search_misses), 1, 'one search miss stored');
select is(
  (select times::int from public.catalogue_misses where kind = 'search' and food = 'wet khaw hin'),
  1,
  'the report counts it'
);

select * from finish();
rollback;
