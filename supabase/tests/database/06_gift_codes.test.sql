-- Gift codes: redeeming turns a code into a pass; limits, campaigns, try limit, access.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, aud, role, is_anonymous) values
  ('a0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', false),
  ('b0000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', false),
  ('c0000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', true),
  ('d0000000-0000-4000-8000-0000000000d4', 'authenticated', 'authenticated', false);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.redeem(uid uuid, code text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform pg_temp.as_user(uid);
  set local role authenticated;
  r := public.redeem_gift_code(code);
  reset role;
  return r;
end;
$$;

-- Making codes (service role).
set local role service_role;
select is(public.create_gift_codes(array['K7Q2M-9XH4T', 'AB3CD-EF4GH'], '1m', null, 1, null, 'test'), 2, 'codes are added');
select is(public.create_gift_codes(array['k7q2m9xh4t'], '1m'), 0, 'the same code (any spelling) is not added twice');
select is(public.create_gift_codes(array['SARAI100'], '3m', 'launch', 2, now() + interval '30 days'), 1, 'a campaign code');
select is(public.create_gift_codes(array['2X2X2-2X2X2'], '1m', 'launch'), 1, 'a second code of the same campaign');
select is(public.create_gift_codes(array['OLDOL-DOLD0'], '1m', null, 1, now() - interval '1 day'), 1, 'an expired code');
select is(public.create_gift_codes(array['GONE0-GONE0'], '1m'), 1, 'a code to revoke');
reset role;
update public.gift_codes set revoked_at = now() where code_hash = private.gift_code_hash('GONE0-GONE0');

select is((select count(*)::int from public.gift_codes where note = 'test'), 2, 'only hashes are stored');
select ok(not exists (select 1 from public.gift_codes where encode(code_hash, 'escape') like '%K7Q2M%'), 'no plain codes');

-- Redeeming.
select is(pg_temp.redeem('a0000000-0000-4000-8000-0000000000a1', ' k7q2m 9xh4t ') ->> 'result', 'ok', 'lower case and spaces are fine');
select ok((select ends_at from public.passes where user_id = 'a0000000-0000-4000-8000-0000000000a1' and payment_provider = 'gift')
  between now() + interval '27 days' and now() + interval '32 days', 'a one-month pass is granted');
select is(pg_temp.redeem('a0000000-0000-4000-8000-0000000000a1', 'K7Q2M-9XH4T') ->> 'result', 'ok', 'redeeming again is safe');
select is((select count(*)::int from public.passes where user_id = 'a0000000-0000-4000-8000-0000000000a1'), 1, '… and grants nothing more');
select is(pg_temp.redeem('b0000000-0000-4000-8000-0000000000b2', 'K7Q2M-9XH4T') ->> 'result', 'used_up', 'a personal code works once');
select is(pg_temp.redeem('b0000000-0000-4000-8000-0000000000b2', 'AB3CD-EF4GH') ->> 'result', 'ok', 'another code works');
select is(pg_temp.redeem('a0000000-0000-4000-8000-0000000000a1', 'AB3CD-EF4GH') ->> 'result', 'used_up', '… only for its first user');
select is(pg_temp.redeem('c0000000-0000-4000-8000-0000000000c3', 'SARAI100') ->> 'result', 'sign_in_required', 'anonymous accounts must sign in first');
select is(pg_temp.redeem('a0000000-0000-4000-8000-0000000000a1', 'sarai100') ->> 'result', 'ok', 'a campaign code');
select is(pg_temp.redeem('a0000000-0000-4000-8000-0000000000a1', '2X2X2-2X2X2') ->> 'result', 'already_used', 'one code per campaign per person');
select is(pg_temp.redeem('a0000000-0000-4000-8000-0000000000a1', 'OLDOL-DOLD0') ->> 'result', 'expired', 'expired codes are refused');
select is(pg_temp.redeem('a0000000-0000-4000-8000-0000000000a1', 'GONE0-GONE0') ->> 'result', 'invalid', 'revoked codes are refused');
select ok((select max(ends_at) from public.passes where user_id = 'a0000000-0000-4000-8000-0000000000a1')
  > now() + interval '3 months 27 days', 'passes chain: 1 month + 3 months');

-- Try limit: 5 wrong codes an hour, then even a good code waits.
select pg_temp.redeem('d0000000-0000-4000-8000-0000000000d4', 'WRONG' || n) from generate_series(1, 5) n;
select is(pg_temp.redeem('d0000000-0000-4000-8000-0000000000d4', '2X2X2-2X2X2') ->> 'result', 'rate_limited', 'too many wrong codes');

-- Access: the app can't read the tables or make codes.
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
set local role authenticated;
select throws_ok($$ select count(*) from public.gift_codes $$, '42501', null, 'codes are not readable');
select throws_ok($$ select public.create_gift_codes(array['FREE1-FREE1'], '3m') $$, '42501', null, 'the app cannot make codes');
reset role;

select * from finish();
rollback;
