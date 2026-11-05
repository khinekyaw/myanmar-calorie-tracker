-- The first week of free scans is 7 Myanmar calendar days, not 7 × 24 hours.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Signed up late in the evening (Myanmar time) 6 and 7 days ago, and today just after midnight.
insert into auth.users (id, aud, role, created_at) values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    (((now() at time zone 'Asia/Yangon')::date - 6) + time '23:59') at time zone 'Asia/Yangon'),
  ('a2a2a2a2-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    (((now() at time zone 'Asia/Yangon')::date - 7) + time '23:59') at time zone 'Asia/Yangon'),
  ('a3a3a3a3-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    ((now() at time zone 'Asia/Yangon')::date + time '00:00:01') at time zone 'Asia/Yangon');

set local role service_role;
select is(public.free_scans_per_day('a1a1a1a1-0000-4000-8000-000000000001', 3, 1), 3, 'day 6 after sign-up: still the first week');
select is(public.free_scans_per_day('a2a2a2a2-0000-4000-8000-000000000002', 3, 1), 1,
  'day 7 after sign-up: the lower allowance, whatever the hour of sign-up');
select is(public.free_scans_per_day('a3a3a3a3-0000-4000-8000-000000000003', 3, 1), 3, 'signed up today: the first week');

-- Day 7: one free scan, then refused; a failed scan gives it back.
select is(
  public.begin_scan('a2a2a2a2-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
    'a2a2a2a2-0000-4000-8000-000000000002/b0000000-0000-4000-8000-000000000001.jpg', now(), 1) ->> 'outcome',
  'go', 'day 7: the one free scan starts');
select is(
  public.begin_scan('a2a2a2a2-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002',
    'a2a2a2a2-0000-4000-8000-000000000002/b0000000-0000-4000-8000-000000000002.jpg', now(), 1) ->> 'outcome',
  'quota_exceeded', 'day 7: a second photo is refused');

select * from finish();
rollback;
