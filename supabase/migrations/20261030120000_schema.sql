-- Sar AI — core schema. Mirrors the phone database (src/db/); see docs/BACKEND.md.
--
-- Sync rules (docs/OFFLINE.md):
--  * ids are made on the phone, so user tables are keyed by (user_id, id);
--  * `updated_at` comes from the phone and decides conflicts (newest wins);
--  * deletes are tombstones (`deleted_at`), never row removals;
--  * `synced_at` is stamped by the server on every write; pulls page by it.
-- Body measurements are metric here (kg / cm); the phone converts.

create schema if not exists private;
revoke all on schema private from public;

create function private.stamp_synced_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

create function private.stamp_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Profile: onboarding answers, preferences and the computed plan ─────────

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  onboarded boolean not null default false,
  sex text check (sex in ('male', 'female')),
  birth_year smallint check (birth_year between 1900 and 2100),
  height_cm numeric(5, 2) check (height_cm between 50 and 260),
  -- Weight given during onboarding; later weights are in `weights`.
  weight_kg numeric(6, 3) check (weight_kg between 20 and 350),
  workday text check (workday in ('office', 'shop', 'physical', 'home')),
  goal text check (goal in ('lose', 'maintain', 'gain')),
  target_weight_kg numeric(6, 3) check (target_weight_kg between 20 and 350),
  pace_kg_week numeric(4, 3) check (pace_kg_week between 0 and 1.5),
  health_flags text[] not null default '{}'
    check (health_flags <@ array['bloodSugar', 'bloodPressure']),
  eating_places text[] not null default '{}'
    check (eating_places <@ array['homeShared', 'riceShop', 'teaShop', 'street', 'delivery']),
  language text not null default 'my' check (language in ('my', 'en')),
  uposatha_vegetarian boolean not null default true,
  -- Daily targets as last computed on the phone (domain/plan.ts), for support and reports.
  kcal_target integer check (kcal_target between 500 and 8000),
  rice_plates_target numeric(3, 1) check (rice_plates_target between 0 and 20),
  protein_g_target integer check (protein_g_target between 0 and 1000),
  fat_g_target integer check (fat_g_target between 0 and 1000),
  carb_g_target integer check (carb_g_target between 0 and 2000),
  updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ── Food logs: one meal = a log and its items, synced as one unit ──────────

create table public.food_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  eaten_at timestamptz not null,
  source text not null check (source in ('photo', 'voice', 'text', 'search', 'quick')),
  status text not null check (status in ('queued', 'analyzing', 'done')),
  -- Object in the private `meal-photos` bucket, always "<user id>/<log id>.jpg".
  photo_path text,
  is_shared_meal boolean not null default false,
  confidence real check (confidence between 0 and 1),
  -- Runner-up dishes from the scan: [{ "dishId": "...", "confidence": 0.3 }, ...]
  candidates jsonb check (
    candidates is null or (jsonb_typeof(candidates) = 'array' and jsonb_array_length(candidates) <= 10)
  ),
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (photo_path is null or photo_path = user_id::text || '/' || id::text || '.jpg')
);

create index food_logs_pull on public.food_logs (user_id, synced_at, id);
create index food_logs_eaten on public.food_logs (user_id, eaten_at) where deleted_at is null;

-- Nutrition is not stored: it's computed from `dishes`, so verified numbers
-- apply to past meals too. No foreign key to `dishes`, on purpose: a phone
-- with a newer bundled catalogue must never get stuck unable to sync.
create table public.log_items (
  user_id uuid not null,
  log_id uuid not null,
  position smallint not null check (position between 0 and 49),
  dish_id text not null check (dish_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  qty numeric(6, 2) not null check (qty between 0 and 100),
  oil text check (oil in ('less', 'normal', 'more')),
  sweetness text check (sweetness in ('choSeint', 'pawSeint', 'kyaSeint', 'pawKya')),
  primary key (user_id, log_id, position),
  foreign key (user_id, log_id) references public.food_logs (user_id, id) on delete cascade
);

-- ── Weight and waist, one row per day ──────────────────────────────────────

create table public.weights (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  weight_kg numeric(6, 3) check (weight_kg between 20 and 350),
  waist_cm numeric(6, 2) check (waist_cm between 25 and 250),
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index weights_pull on public.weights (user_id, synced_at, day);

create trigger profiles_synced_at before insert or update on public.profiles
  for each row execute function private.stamp_synced_at();
create trigger food_logs_synced_at before insert or update on public.food_logs
  for each row execute function private.stamp_synced_at();
create trigger weights_synced_at before insert or update on public.weights
  for each row execute function private.stamp_synced_at();

-- ── Dish catalogue (the moat): edited by the nutritionist, read by everyone ─

create table public.dishes (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  name_my text not null check (length(name_my) between 1 and 120),
  name_en text not null check (length(name_en) between 1 and 120),
  aliases_my text[] not null default '{}',
  aliases_zawgyi text[] not null default '{}',
  aliases_roman text[] not null default '{}',
  -- Nutrition is for ONE unit.
  unit text not null check (unit in ('plate', 'bowl', 'spoon', 'piece', 'cup')),
  kcal numeric(6, 1) not null check (kcal >= 0),
  carb_g numeric(6, 1) not null check (carb_g >= 0),
  protein_g numeric(6, 1) not null check (protein_g >= 0),
  fat_g numeric(6, 1) not null check (fat_g >= 0),
  oil_sensitive boolean not null default false,
  has_sweetness boolean not null default false,
  is_vegetarian boolean not null default false,
  -- Where the numbers come from (reference table, lab, estimate).
  source text,
  -- Set together when the nutritionist has checked the numbers ("Verified" badge).
  verified_by text,
  verified_at timestamptz,
  -- Object in the public `dish-photos` bucket, for dishes without a bundled photo.
  photo_path text,
  updated_at timestamptz not null default now(),
  -- A retired dish stays readable (old meals reference it) but leaves search.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check ((verified_by is null) = (verified_at is null))
);

create index dishes_pull on public.dishes (updated_at, id);

create trigger dishes_updated_at before insert or update on public.dishes
  for each row execute function private.stamp_updated_at();

-- ── Premium passes: created by the server only (payments), read by the owner ─

create table public.passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('1m', '3m')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  payment_provider text not null,
  payment_ref text not null,
  amount_ks integer check (amount_ks >= 0),
  created_at timestamptz not null default now(),
  -- A payment confirmation delivered twice must not grant two passes.
  unique (payment_provider, payment_ref),
  check (ends_at > starts_at)
);

create index passes_user on public.passes (user_id, ends_at);

-- ── Free photo scans per day (Asia/Yangon days), changed only by the server ─

create table public.scan_quota (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  used smallint not null default 0 check (used >= 0),
  primary key (user_id, day)
);

-- One row per scanned photo: makes `scan` retry-safe (a lost answer is
-- returned again without a second charge) and records the AI cost.
create table public.scans (
  user_id uuid not null references auth.users (id) on delete cascade,
  log_id uuid not null,
  photo_path text not null,
  status text not null check (status in ('pending', 'done', 'failed')),
  -- Quota day this scan used; null for Premium, or after a refund.
  charged_day date,
  attempts smallint not null default 1,
  model text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  cost_usd numeric(10, 6),
  latency_ms integer,
  response jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_id)
);

create index scans_recent on public.scans (updated_at);

-- ── Row-level security ─────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.log_items enable row level security;
alter table public.weights enable row level security;
alter table public.dishes enable row level security;
alter table public.passes enable row level security;
alter table public.scan_quota enable row level security;
alter table public.scans enable row level security;

-- Own rows only. No delete policies on synced tables: deletes are tombstones,
-- and the rows go when the account is deleted (cascade).
create policy "profiles: own" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "profiles: insert own" on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "food_logs: own" on public.food_logs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "food_logs: insert own" on public.food_logs for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "food_logs: update own" on public.food_logs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Items are rewritten whenever their log is saved, so they can be deleted.
create policy "log_items: own" on public.log_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy "log_items: insert own" on public.log_items for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "log_items: delete own" on public.log_items for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "weights: own" on public.weights for select to authenticated
  using (user_id = (select auth.uid()));
create policy "weights: insert own" on public.weights for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "weights: update own" on public.weights for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "dishes: everyone reads" on public.dishes for select to anon, authenticated
  using (true);

create policy "passes: own" on public.passes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "scan_quota: own" on public.scan_quota for select to authenticated
  using (user_id = (select auth.uid()));

-- `scans` has no policies: only the service role (Edge Functions) uses it.

-- ── Grants (explicit, so nothing depends on auto-exposed tables) ───────────

revoke all on public.profiles, public.food_logs, public.log_items, public.weights,
  public.dishes, public.passes, public.scan_quota, public.scans from anon, authenticated;

grant select, insert, update on public.profiles, public.food_logs, public.weights to authenticated;
grant select, insert, delete on public.log_items to authenticated;
grant select on public.passes, public.scan_quota to authenticated;
grant select on public.dishes to anon, authenticated;

grant all on public.profiles, public.food_logs, public.log_items, public.weights,
  public.dishes, public.passes, public.scan_quota, public.scans to service_role;
