-- Free-scan quota (begin_scan / finish_scan) and Premium passes (grant_pass).
-- These run as the service role, as the Edge Functions do.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, aud, role) values
  ('cccccccc-0000-4000-8000-000000000003', 'authenticated', 'authenticated'),
  ('dddddddd-0000-4000-8000-000000000004', 'authenticated', 'authenticated');

create function pg_temp.scan(n int, taken timestamptz default now()) returns jsonb language sql as $$
  select public.begin_scan('cccccccc-0000-4000-8000-000000000003',
    ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'photo.jpg', taken, 3);
$$;
create function pg_temp.finish(n int, ok boolean) returns jsonb language sql as $$
  select public.finish_scan('cccccccc-0000-4000-8000-000000000003',
    ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, ok,
    case when ok then '{"shared_table": false, "items": []}'::jsonb end, case when ok then null else 'boom' end,
    'claude-opus-5-5', 1000, 50, 0, 0, 0.005, 1200, 3);
$$;

set local role service_role;

select is(pg_temp.scan(1) ->> 'outcome', 'go', 'first scan starts');
select is((pg_temp.scan(1)) ->> 'outcome', 'in_progress', 'the same photo twice at once is refused');
select is((pg_temp.finish(1, true)) ->> 'scans_left', '2', 'a finished scan used one free scan');
select is(pg_temp.scan(1) ->> 'outcome', 'cached', 'a repeated request returns the stored answer');
select is((select used from public.scan_quota
    where user_id = 'cccccccc-0000-4000-8000-000000000003' and day = (now() at time zone 'Asia/Yangon')::date), 1::smallint,
  'a repeated request is not charged again');

-- A failed scan gives the free scan back; its retry is charged once.
select pg_temp.scan(2);
select is((pg_temp.finish(2, false)) ->> 'scans_left', '2', 'a failed scan is refunded');
select is(pg_temp.scan(2) ->> 'outcome', 'go', 'a failed scan can be retried');
select is((select attempts from public.scans where log_id = '00000000-0000-4000-8000-000000000002'), 2::smallint,
  'retries are counted');
select pg_temp.finish(2, true);

select pg_temp.scan(3);
select pg_temp.finish(3, true);
select is(pg_temp.scan(4) ->> 'outcome', 'quota_exceeded', 'the 4th scan of the day is refused');

-- A photo taken yesterday (queued offline) uses yesterday's scans.
select is(pg_temp.scan(5, now() - interval '1 day') ->> 'outcome', 'go', 'a queued photo from yesterday is scanned');
select is((select charged_day from public.scans where log_id = '00000000-0000-4000-8000-000000000005'),
  ((now() - interval '1 day') at time zone 'Asia/Yangon')::date, 'it is counted on the day it was taken');
select is(pg_temp.scan(6, now() - interval '30 days') ->> 'outcome', 'quota_exceeded',
  'old photos count as today');

-- Cost is recorded.
select is((select sum(cost_usd) from public.scans where user_id = 'cccccccc-0000-4000-8000-000000000003'), 0.02::numeric,
  'AI cost adds up over every attempt');

-- ── Premium ────────────────────────────────────────────────────────────────
select is((public.grant_pass('cccccccc-0000-4000-8000-000000000003', '1m', 'kbzpay', 'tx-1')).plan, '1m',
  'a pass is granted');
select is((select count(*)::int from public.passes where user_id = 'cccccccc-0000-4000-8000-000000000003'), 1,
  'a pass is stored');
select public.grant_pass('cccccccc-0000-4000-8000-000000000003', '1m', 'kbzpay', 'tx-1');
select is((select count(*)::int from public.passes where user_id = 'cccccccc-0000-4000-8000-000000000003'), 1,
  'the same payment twice grants one pass');
select public.grant_pass('cccccccc-0000-4000-8000-000000000003', '3m', 'kbzpay', 'tx-2');
select is(
  (select starts_at from public.passes where payment_ref = 'tx-2'),
  (select ends_at from public.passes where payment_ref = 'tx-1'),
  'a second pass starts when the first ends'
);
select is(pg_temp.scan(7) ->> 'outcome', 'go', 'Premium scans past the free limit');
select is(pg_temp.scan(7) -> 'scans_left', 'null'::jsonb, 'Premium has no scan counter');

-- ── Daily AI budget ────────────────────────────────────────────────────────
select is(
  public.begin_scan('dddddddd-0000-4000-8000-000000000004', gen_random_uuid(), 'p.jpg', now(), 3, 0.01) ->> 'outcome',
  'budget_exceeded',
  'scans stop when the daily AI budget is used up'
);

select * from finish();
rollback;
