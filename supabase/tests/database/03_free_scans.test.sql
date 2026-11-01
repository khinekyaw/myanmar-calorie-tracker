-- Free scans a day: the first-week allowance, then the lower one.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, aud, role, created_at) values
  ('eeeeeeee-0000-4000-8000-000000000005', 'authenticated', 'authenticated', now() - interval '2 days'),
  ('ffffffff-0000-4000-8000-000000000006', 'authenticated', 'authenticated', now() - interval '8 days');

set local role service_role;
select is(public.free_scans_per_day('eeeeeeee-0000-4000-8000-000000000005', 3, 1), 3, 'first week: the higher allowance');
select is(public.free_scans_per_day('ffffffff-0000-4000-8000-000000000006', 3, 1), 1, 'after a week: the lower allowance');
select is(public.free_scans_per_day(gen_random_uuid(), 3, 1), 1, 'unknown user: the lower allowance');

reset role;
set local role authenticated;
select throws_ok(
  $$ select public.free_scans_per_day('eeeeeeee-0000-4000-8000-000000000005', 99, 99) $$,
  '42501', null, 'the app cannot call it'
);

select * from finish();
rollback;
