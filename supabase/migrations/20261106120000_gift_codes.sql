-- Gift codes: Premium given with a code before payments exist
-- (docs/LAUNCH_CHECKLIST.md → "Gift codes"). A code becomes an ordinary pass
-- through grant_pass (provider 'gift'), so everything that reads `passes`
-- keeps working. Codes are stored only as a hash of their normalised form.

-- ── Normalising and hashing ─────────────────────────────────────────────

-- Forgiving input: case, spaces and dashes don't matter, Burmese digits
-- count as digits, and O / I / L are read as 0 / 1 / 1 (Crockford base32,
-- which the generated codes use, has none of those letters).
create function private.normalize_gift_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(upper(coalesce(p_code, '')), '၀၁၂၃၄၅၆၇၈၉OIL', '0123456789011'),
    '[^0-9A-Z]', '', 'g'
  );
$$;

create function private.gift_code_hash(p_code text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(private.normalize_gift_code(p_code), 'UTF8'));
$$;

-- ── Tables (server only: row-level security on, no client policies) ────

create table public.gift_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash bytea not null unique,
  plan text not null check (plan in ('1m', '3m')),
  -- Codes made together (a giveaway, a clinic): one code per campaign per person.
  campaign text,
  max_uses integer not null default 1 check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  -- Redeemable while now() is before this.
  expires_at timestamptz,
  revoked_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table public.gift_redemptions (
  code_id uuid not null references public.gift_codes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign text,
  pass_id uuid not null references public.passes (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code_id, user_id)
);

create unique index gift_redemptions_campaign on public.gift_redemptions (campaign, user_id) where campaign is not null;

-- Wrong codes, for the try limit (5 an hour per account; not per IP, which
-- Myanmar mobile networks share).
create table public.gift_code_failures (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);

create index gift_code_failures_user on public.gift_code_failures (user_id, at);

alter table public.gift_codes enable row level security;
alter table public.gift_redemptions enable row level security;
alter table public.gift_code_failures enable row level security;
revoke all on public.gift_codes, public.gift_redemptions, public.gift_code_failures from anon, authenticated;

-- ── Redeeming (called by the app) ───────────────────────────────────────

-- Returns { result, ends_at }. result: ok · invalid · expired · used_up ·
-- already_used (another code of the same campaign) · rate_limited ·
-- sign_in_required (anonymous accounts: a pass there is lost when the phone
-- switches to an existing account). Redeeming the same code again returns
-- ok with the same pass, so a retry after a lost answer is safe.
create function public.redeem_gift_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  code public.gift_codes;
  done public.gift_redemptions;
  pass public.passes;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if coalesce((select u.is_anonymous from auth.users u where u.id = me), true) then
    return jsonb_build_object('result', 'sign_in_required');
  end if;

  -- One redemption at a time per account (campaign check, try limit).
  perform pg_advisory_xact_lock(hashtextextended('redeem_gift_code:' || me::text, 0));

  if (select count(*) from public.gift_code_failures f where f.user_id = me and f.at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('result', 'rate_limited');
  end if;

  select * into code from public.gift_codes c where c.code_hash = private.gift_code_hash(p_code) for update;
  if not found or private.normalize_gift_code(p_code) = '' then
    insert into public.gift_code_failures (user_id) values (me);
    return jsonb_build_object('result', 'invalid');
  end if;

  select * into done from public.gift_redemptions r where r.code_id = code.id and r.user_id = me;
  if found then
    select * into pass from public.passes p where p.id = done.pass_id;
    return jsonb_build_object('result', 'ok', 'ends_at', pass.ends_at);
  end if;

  if code.revoked_at is not null then
    return jsonb_build_object('result', 'invalid');
  end if;
  if code.expires_at is not null and now() >= code.expires_at then
    return jsonb_build_object('result', 'expired');
  end if;
  if code.uses >= code.max_uses then
    return jsonb_build_object('result', 'used_up');
  end if;
  if code.campaign is not null and exists (
    select 1 from public.gift_redemptions r where r.campaign = code.campaign and r.user_id = me
  ) then
    return jsonb_build_object('result', 'already_used');
  end if;

  pass := public.grant_pass(me, code.plan, 'gift', code.id::text || ':' || me::text);
  update public.gift_codes set uses = uses + 1 where id = code.id;
  insert into public.gift_redemptions (code_id, user_id, campaign, pass_id) values (code.id, me, code.campaign, pass.id);
  return jsonb_build_object('result', 'ok', 'ends_at', pass.ends_at);
end;
$$;

-- ── Making codes (team only: scripts/codes/make.ts, service role) ───────

-- Adds codes given in plain text (hashed here, never stored); returns how
-- many were new. A code that already exists is skipped.
create function public.create_gift_codes(
  p_codes text[],
  p_plan text,
  p_campaign text default null,
  p_max_uses integer default 1,
  p_expires_at timestamptz default null,
  p_note text default null
)
returns integer
language sql
security definer
set search_path = ''
as $$
  with added as (
    insert into public.gift_codes (code_hash, plan, campaign, max_uses, expires_at, note)
    select private.gift_code_hash(c), p_plan, p_campaign, p_max_uses, p_expires_at, p_note
    from unnest(p_codes) as c
    where private.normalize_gift_code(c) <> ''
    on conflict (code_hash) do nothing
    returning 1
  )
  select count(*)::integer from added;
$$;

revoke execute on function private.normalize_gift_code(text), private.gift_code_hash(text) from public;
revoke execute on function public.redeem_gift_code(text) from public, anon;
grant execute on function public.redeem_gift_code(text) to authenticated;
revoke execute on function public.create_gift_codes(text[], text, text, integer, timestamptz, text) from public, anon, authenticated;
grant execute on function public.create_gift_codes(text[], text, text, integer, timestamptz, text) to service_role;
