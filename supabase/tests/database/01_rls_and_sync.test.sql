-- Row-level security and the sync functions.
-- Run: npm run test:db   (or `npx supabase test db`)
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

-- Two users. auth.uid() reads the `sub` claim.
insert into auth.users (id, aud, role, is_anonymous) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated', true),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', false);

create function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- ── User A pushes a meal, a weight and a profile ───────────────────────────
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');

select is(
  public.sync_push(jsonb_build_object(
    'profile', jsonb_build_object('onboarded', true, 'sex', 'male', 'goal', 'lose', 'language', 'en',
      'health_flags', jsonb_build_array('bloodPressure'), 'updated_at', now() - interval '1 hour'),
    'food_logs', jsonb_build_array(jsonb_build_object(
      'id', 'a0000000-0000-4000-8000-000000000001', 'eaten_at', now(), 'source', 'search', 'status', 'done',
      'updated_at', now() - interval '1 hour',
      'items', jsonb_build_array(
        jsonb_build_object('dish_id', 'tea', 'qty', 1, 'sweetness', 'pawSeint'),
        jsonb_build_object('dish_id', 'palata', 'qty', 2)))),
    'weights', jsonb_build_array(jsonb_build_object('day', '2026-10-01', 'weight_kg', 70.5,
      'updated_at', now() - interval '1 hour'))
  )) -> 'rejected',
  '[]'::jsonb,
  'a valid push is accepted'
);

select is((select count(*)::int from public.log_items), 2, 'items are stored in order');
select is((select dish_id from public.log_items where position = 1), 'palata', 'item order is kept');
select is((select language from public.profiles), 'en', 'profile is stored');

-- Older phone copy loses and the server copy comes back.
select is(
  public.sync_push(jsonb_build_object('food_logs', jsonb_build_array(jsonb_build_object(
    'id', 'a0000000-0000-4000-8000-000000000001', 'eaten_at', now(), 'source', 'text', 'status', 'done',
    'updated_at', now() - interval '2 hours', 'items', '[]'::jsonb)))) -> 'food_logs' -> 0 ->> 'source',
  'search',
  'an older change is ignored and the newer server row is returned'
);
select is((select count(*)::int from public.log_items), 2, 'items of the newer row are untouched');

-- Newer phone copy wins and rewrites the items.
select public.sync_push(jsonb_build_object('food_logs', jsonb_build_array(jsonb_build_object(
  'id', 'a0000000-0000-4000-8000-000000000001', 'eaten_at', now(), 'source', 'text', 'status', 'done',
  'updated_at', now() - interval '30 minutes',
  'items', jsonb_build_array(jsonb_build_object('dish_id', 'mohinga', 'qty', 1))))));
select is((select source from public.food_logs), 'text', 'a newer change wins');
select is((select array_agg(dish_id)::text from public.log_items), '{mohinga}', 'items are replaced');

-- Tombstone
select public.sync_push(jsonb_build_object('food_logs', jsonb_build_array(jsonb_build_object(
  'id', 'a0000000-0000-4000-8000-000000000001', 'eaten_at', now(), 'source', 'text', 'status', 'done',
  'updated_at', now() - interval '20 minutes', 'deleted_at', now() - interval '20 minutes', 'items', '[]'::jsonb))));
select isnt((select deleted_at from public.food_logs), null, 'a delete is stored as a tombstone');

-- A phone clock far in the future is clamped.
select public.sync_push(jsonb_build_object('weights', jsonb_build_array(jsonb_build_object(
  'day', '2026-10-02', 'weight_kg', 70, 'updated_at', now() + interval '1 year'))));
select ok((select updated_at from public.weights where day = '2026-10-02') <= now() + interval '5 minutes',
  'future timestamps are clamped');

-- Bad rows are rejected one by one; good rows in the same push still land.
select is(
  jsonb_array_length(public.sync_push(jsonb_build_object('food_logs', jsonb_build_array(
    jsonb_build_object('id', 'nope'),
    jsonb_build_object('id', 'a0000000-0000-4000-8000-000000000002', 'eaten_at', now(), 'source', 'magic',
      'status', 'done', 'updated_at', now(), 'items', '[]'::jsonb),
    jsonb_build_object('id', 'a0000000-0000-4000-8000-000000000003', 'eaten_at', now(), 'source', 'quick',
      'status', 'done', 'updated_at', now(), 'items', jsonb_build_array(jsonb_build_object('dish_id', 'tea', 'qty', 500))),
    jsonb_build_object('id', 'a0000000-0000-4000-8000-000000000004', 'eaten_at', now(), 'source', 'quick',
      'status', 'done', 'updated_at', now(), 'items', jsonb_build_array(jsonb_build_object('dish_id', 'tea', 'qty', 1)))
  ))) -> 'rejected'),
  3,
  'invalid rows are rejected individually'
);
select ok(exists (select 1 from public.food_logs where id = 'a0000000-0000-4000-8000-000000000004'),
  'the valid row in a mixed push is stored');
select is((select count(*)::int from public.log_items where log_id = 'a0000000-0000-4000-8000-000000000003'), 0,
  'a rejected meal leaves no items behind');

select is(
  jsonb_array_length(public.sync_push(jsonb_build_object('food_logs', jsonb_build_array(jsonb_build_object(
    'id', 'a0000000-0000-4000-8000-000000000005', 'eaten_at', now(), 'source', 'photo', 'status', 'done',
    'photo_path', 'bbbbbbbb-0000-4000-8000-000000000002/a0000000-0000-4000-8000-000000000005.jpg',
    'updated_at', now(), 'items', '[]'::jsonb)))) -> 'rejected'),
  1,
  'a photo path in someone else''s folder is rejected'
);

select throws_ok(
  format('select public.sync_push(%L::jsonb)', jsonb_build_object('weights',
    (select jsonb_agg(jsonb_build_object('day', '2026-01-01'::date + g, 'weight_kg', 70, 'updated_at', now()))
     from generate_series(1, 501) g))),
  '54000', null, 'oversized pushes are refused'
);

-- ── Pull and paging ────────────────────────────────────────────────────────
select is(jsonb_array_length(public.sync_pull() -> 'food_logs' -> 'rows'), 2, 'pull returns the user''s meals');
select is(public.sync_pull() -> 'profile' ->> 'language', 'en', 'pull returns the profile');
select is(jsonb_array_length(public.sync_pull() -> 'dishes' -> 'rows'), (select count(*)::int from public.dishes),
  'pull returns the catalogue');
select is(public.sync_pull(now() + interval '1 hour') -> 'food_logs' -> 'rows', '[]'::jsonb,
  'nothing is returned when nothing changed since the cursor');

select isnt(public.sync_pull(null, null, 1) -> 'food_logs' -> 'next', 'null'::jsonb, 'a full page has a next key');
select is(
  jsonb_array_length(public.sync_pull(null,
    jsonb_build_object('food_logs', public.sync_pull(null, null, 1) -> 'food_logs' -> 'next'), 1) -> 'food_logs' -> 'rows'),
  1,
  'the next page continues after the key'
);
select ok(not (public.sync_pull(null, jsonb_build_object('food_logs',
  public.sync_pull(null, null, 1) -> 'food_logs' -> 'next'), 1) ? 'weights'),
  'later pages only return the lists that asked for more');

-- ── User B sees none of it ─────────────────────────────────────────────────
select pg_temp.as_user('bbbbbbbb-0000-4000-8000-000000000002');
select is((select count(*)::int from public.food_logs), 0, 'another user cannot read meals');
select is((select count(*)::int from public.weights), 0, 'another user cannot read weights');
select is(public.sync_pull() -> 'profile', 'null'::jsonb, 'another user gets no profile');
select is(jsonb_array_length(public.sync_pull() -> 'food_logs' -> 'rows'), 0, 'another user pulls nothing');

update public.food_logs set source = 'voice';
reset role;
select is((select count(*)::int from public.food_logs
  where user_id = 'aaaaaaaa-0000-4000-8000-000000000001' and source = 'voice'), 0, 'another user cannot change meals');

-- B pushes a meal with the same phone-made id: it is B's own row.
select pg_temp.as_user('bbbbbbbb-0000-4000-8000-000000000002');
select public.sync_push(jsonb_build_object('food_logs', jsonb_build_array(jsonb_build_object(
  'id', 'a0000000-0000-4000-8000-000000000004', 'eaten_at', now(), 'source', 'voice', 'status', 'done',
  'updated_at', now(), 'items', '[]'::jsonb))));
reset role;
select is((select count(*)::int from public.food_logs where id = 'a0000000-0000-4000-8000-000000000004'), 2,
  'the same id under two accounts does not clash');

-- ── What users may not touch ───────────────────────────────────────────────
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select throws_ok($$insert into public.passes (user_id, plan, starts_at, ends_at, payment_provider, payment_ref)
  values (auth.uid(), '3m', now(), now() + interval '90 days', 'me', 'free')$$, '42501', null,
  'users cannot grant themselves Premium');
select throws_ok($$select public.grant_pass(auth.uid(), '3m', 'me', 'free')$$, '42501', null,
  'users cannot call grant_pass');
select throws_ok($$select public.begin_scan(auth.uid(), gen_random_uuid(), 'x', now(), 100)$$, '42501', null,
  'users cannot call begin_scan');

-- A token that outlives its deleted account is refused, so the phone starts over.
reset role;
delete from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000002';
select pg_temp.as_user('bbbbbbbb-0000-4000-8000-000000000002');
select throws_ok('select public.sync_pull()', '28000', null, 'pull refuses a deleted account');
select throws_ok($$select public.sync_push('{}'::jsonb)$$, '28000', null, 'push refuses a deleted account');

-- Visitors without an account only see the catalogue.
reset role;
set local role anon;
select ok((select count(*)::int from public.dishes) >= 15, 'anyone can read the catalogue');

select * from finish();
rollback;
