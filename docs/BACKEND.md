# Sar AI — Backend

Status (2026-10-30): **built and tested locally**; not deployed yet. Database, sync, accounts, photo scan and account deletion work end to end against the local Supabase stack (see [Tested](#tested)). Payments, Google sign-in and monitoring are still open ([What's left](#whats-left)).

## Decisions

- **Supabase, hosted** (Singapore region): Postgres, Auth, Storage, Edge Functions. Not self-hosted: backups, patches, security and uptime would be our job, and hosting in Myanmar is unreliable (power and internet shutdowns). Revisit only if law or cost requires it.
- **Languages:** SQL (schema, row-level security, database functions) and **TypeScript** Edge Functions (Deno). App uses `@supabase/supabase-js`. No separate Node/Python server.
- **Offline-first stays:** the phone database is the source of truth ([OFFLINE.md](OFFLINE.md)); the server is the sync target.
- **Lock-in is low:** everything lives in the repo as migrations and functions (`supabase/`); underneath it's plain Postgres.

## What's in `supabase/`

```
config.toml                 local stack settings (auth, SMS test numbers, functions)
migrations/
  20261030120000_schema.sql        tables, row-level security, grants
  20261030120100_sync.sql          sync_push / sync_pull
  20261030120200_scans_passes.sql  free-scan quota, scan log, Premium passes
  20261030120300_storage.sql       meal-photos (private) and dish-photos (public) buckets
seeds/catalogue.sql         dish list, generated from src/mocks/dishes.ts (recipe-calculated numbers, drafts)
seeds/dev.sql               local only: logs SMS codes instead of sending them
functions/scan/             photo → dishes (Claude vision)
functions/delete-account/   deletes the account, its photos and every row
functions/_shared/scanContract.ts   answer validation, shared with Jest tests
tests/database/*.sql        pgTAP: RLS, sync conflicts, paging, quota, passes (54 tests)
```

### Tables

All user tables are keyed by `(user_id, id)` with phone-made ids, carry the phone's `updated_at` (newest wins) and a server `synced_at` (pull cursor), and use `deleted_at` tombstones. Units are metric.

| Table | What | Who writes |
|---|---|---|
| `profiles` | onboarding answers, language, Uposatha, last plan targets | the user (via sync) |
| `food_logs` + `log_items` | meals and their dishes; nutrition is computed from `dishes`, never stored | the user (via sync) |
| `weights` | weight (kg) and waist (cm) per day | the user (via sync) |
| `dishes` | the catalogue; readable by everyone, retired dishes keep their row | team (Studio / SQL) |
| `passes` | Premium passes | server only (`grant_pass`) |
| `scan_quota` | free scans used per Myanmar day; the allowance is 3 in the account's first week, then 1 (`free_scans_per_day`, `FREE_SCANS_FIRST_WEEK` / `FREE_SCANS_PER_DAY`) | server only (`begin_scan`) |
| `scans` | one row per scanned photo: status, answer, tokens, cost | server only |

Users can read and write only their own rows; nobody can grant themselves Premium or scans (tests prove both).

### Sync (`sync_push`, `sync_pull`)

One round trip each, for slow mobile data. Details and the reasons in [OFFLINE.md → How sync works](OFFLINE.md#how-sync-works).

### `scan` function

`POST /functions/v1/scan { log_id, taken_at }` with the user's token, after the app uploads `meal-photos/<user id>/<log id>.jpg`:

1. `begin_scan` (atomic): returns the stored answer if this photo was already scanned; refuses a second request for the same photo while one runs; uses a free scan on the day the photo was **taken** (Myanmar time; queued photos from yesterday use yesterday's scans; older than 2 days counts as today), skipped with an active pass; stops everyone if the day's AI budget is spent.
2. Photo + catalogue (cached prompt) → the vision model with structured JSON output: Claude (plus the server-side refusal fallback on Sonnet and Opus; Haiku has none) or Gemini, depending on `SCAN_MODEL` (`_shared/vision.ts`).
3. `parseScanOutput` checks the answer: unknown dishes become `dish_id: null` with a name, units come from the catalogue, numbers are clamped, runner-ups must be real dishes.
4. `finish_scan` stores the answer and cost; a failure **gives the free scan back**.

Answers: `200 { scan, scans_left }` · `402` no free scans · `404` photo not uploaded · `409` already scanning · `502` failed (retry) · `503` not configured or over budget.

Settings (function secrets, see `functions/.env.example`):
- `SCAN_MODEL` (default `claude-haiku-5-5`): any `claude-*` or `gemini-*` id, e.g. `gemini-3.1-flash-lite` (Gemini 2.5 models are closed to new accounts). The provider follows from the name.
- `ANTHROPIC_API_KEY` for Claude models, `GEMINI_API_KEY` for Gemini models. Without the matching key, scans answer `503 not_configured`. **For Gemini, use a key from a project with billing on.** On the free tier, Google may use and have people review the photos ([terms](https://ai.google.dev/gemini-api/terms)).
- `SCAN_EFFORT` (default `low`: a short perception task while the user waits). On Gemini, `low` asks for the least thinking: `thinkingBudget: 0` on 2.5, `thinkingLevel: minimal` on 3.x, which rejects a zero budget.
- `FREE_SCANS_FIRST_WEEK` (3), `FREE_SCANS_PER_DAY` (1), `SCAN_DAILY_BUDGET_USD` (no cap when empty).

Model and effort are to be chosen with the ~100 labelled photos. To add a model, give its price in `PRICES` (`_shared/vision.ts`) so the cost log stays right; an unknown model logs no cost.

### Accounts

- Every phone gets an **anonymous account** the first time it's online, so data syncs even after *Skip*.
- **Sign in with a phone number** (Welcome → *I have an account*, the end of onboarding, or Settings → Phone number): if the phone is anonymous, the number is **linked** to that account (same id, nothing moves). If the number already has an account, the phone **switches** to it and pushes its local meals into it (merge).
- **Sign in with Google** (same places, *Continue with Google*): an in-app browser sheet runs Supabase's Google OAuth (PKCE) and returns to `sarai://auth/callback`. An anonymous phone **links** Google to its account with `linkIdentity` (needs *manual linking* on); if that Google account already has a Sar AI account, the phone **switches** to it and merges, as with a phone number. Settings shows the Google email. Code: `services/auth.ts → signInWithGoogle`.
- **Phone confirmations must stay on** (`[auth.sms] enable_confirmations = true`, and the same switch in the dashboard). Without it, linking a number skips the code check, so anyone could claim someone else's number. Found and fixed during testing.
- **Delete account** (Settings): `delete-account` removes photos, then the auth user; every row cascades. The phone then wipes its data and starts a fresh anonymous account. Required by Google Play.
- A token stays valid for up to an hour after its account is deleted elsewhere; `sync_*` refuse it (`28000`) and the app starts over at once with everything still on the phone.

## Running locally

```bash
npm run db:start            # Supabase in Docker (first run downloads images)
cp .env.example .env.local  # then paste the publishable key from `npx supabase status`
npx expo start              # Metro reads .env.local; the app now syncs to the local stack
```

- The Android emulator reaches the Mac at `10.0.2.2`; a real phone needs the Mac's LAN address.
- **Sign-in test numbers** (no SMS): +95 9123456789 → `123456`, +95 9987654321 → `654321`. Other numbers: the code is in `docker logs supabase_db_sar-ai 2>&1 | grep "SMS code"`. One code per number per 30 seconds.
- **Google sign-in** needs an OAuth client: put `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` in `supabase/.env` (not committed) and restart the stack. In Google Cloud the client's authorized redirect URI is `http://127.0.0.1:54321/auth/v1/callback`; on the emulator run `adb reverse tcp:54321 tcp:54321` so the browser can reach it. Without a client the button opens Google with an invalid client id.
- **Scans** need the functions running with a key: copy `supabase/functions/.env.example` to `supabase/functions/.env`, set the key for `SCAN_MODEL` (`ANTHROPIC_API_KEY` or `GEMINI_API_KEY`), then `npx supabase functions serve --env-file supabase/functions/.env`.
- Without `.env.local` the app runs exactly as the prototype did (mock scan, any sign-in code).
- **macOS:** Docker Desktop needs access to the Desktop folder (System Settings → Privacy & Security → Files and Folders → Docker → Desktop Folder) to mount this project. Without it, Studio and the functions runtime can't start: use `npx supabase start -x edge-runtime,studio`, and serve functions from a copy of `supabase/` outside Desktop (`--workdir`).

| Command | What |
|---|---|
| `npm run test:db` | pgTAP database tests (also works without the Desktop permission) |
| `npm run check:functions` | type-check the Edge Functions with Deno |
| `npm test` | Jest, including sync mapping, scan contract and the seed check |
| `npm run db:reset` | re-apply migrations and seeds (wipes local data) |
| `npm run db:types` | regenerate `src/services/database.types.ts` after a schema change |

Schema changes = a **new** migration file (never edit one that has been deployed), then `db:types`. After changing `src/mocks/dishes.ts`: `UPDATE_SEED=1 npx jest scripts/__tests__/catalogueSeed.test.ts`.

## Tested

2026-10-30, local stack + Android emulator (Pixel_10, Burmese UI), real app code. Claude itself wasn't called (no API key on this machine): a local stand-in for the Messages API returned fixed answers and recorded the requests, so everything around the model was exercised.

| Flow | Result |
|---|---|
| First launch online: anonymous account, all local meals, weights and profile pushed | ✅ 25 meals, 23 weights, profile (kg/cm) |
| Quick re-log, weight log | ✅ on the server within ~3 s; 149.5 lb → 67.812 kg → 149.50 lb |
| Photo → upload → `scan` → Result → synced meal with photo path | ✅ 1 free scan used, cost logged, request had caching, fallback, JSON schema |
| Offline: meal + photo queued, back online → sent, scanned, synced | ✅ |
| Link phone from Settings (wrong code → message; right code → same account, now permanent) | ✅ |
| Second phone signs in: full restore; its new meal appears on the first phone; deleting it there reaches the second | ✅ |
| *I have an account* on a fresh phone: meals, weights, profile, language restored, plan recomputed | ✅ |
| Delete account: server rows, photos and auth user gone; phone wiped to Welcome; new anonymous account | ✅ |
| Account deleted while a token is still valid → phone starts over automatically | ✅ (bug found and fixed) |
| `scan` edge cases with curl: repeat → cached, missing photo → 404 + refund, refusal → 502 + refund, 4th scan → 402, other user's folder → refused, no token → 401 | ✅ |

## Deploying (staging, then production)

1. Create the project (Singapore). Dashboard → Auth: enable **anonymous sign-ins**, **phone** with **confirmations on**, and an SMS route (provider, or a *Send SMS* hook to a Myanmar SMS gateway); set rate limits (mobile networks in Myanmar share IPs, so per-IP limits need care) and turn on **CAPTCHA for anonymous sign-ins** (needs a small app change).
2. `npx supabase link --project-ref <ref>` → `npx supabase db push` (migrations only; `seeds/dev.sql` is never pushed).
3. Load the catalogue once: run `supabase/seeds/catalogue.sql` in the SQL editor (it never overwrites existing dishes).
4. Google: in Google Cloud create an OAuth client of type *Web application* with authorized redirect URI `https://<ref>.supabase.co/auth/v1/callback` (and the OAuth consent screen). Dashboard → Auth → Providers → Google: enable, paste client id and secret. Auth → URL Configuration: add `sarai://auth/callback` to the redirect URLs. Auth → Sign In / Providers: turn on **Allow manual linking**.
5. `npx supabase secrets set --env-file <file>` (see `functions/.env.example`; set `SCAN_DAILY_BUDGET_USD`), then `npx supabase functions deploy scan delete-account`.
6. App build env: `EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…` (EAS environment variables). Never ship a secret key.
7. Smoke test: sign in with a real +95 number and with Google, log a meal, scan a photo, delete the account.

## What's left

| Item | Needs | Phase |
|---|---|---|
| Real scans + model/effort choice | Anthropic API key; ~100 labelled Myanmar meal photos for an accuracy test | 2 |
| SMS delivery to +95 | SMS provider account or gateway (+ Send SMS hook) | 3 |
| Google sign-in | Built (browser OAuth, links the anonymous account). Needs a Google Cloud OAuth client (Web application) and its id/secret in `supabase/.env` locally or the dashboard; not yet tried against real Google | 3 |
| Payments: webhook → `grant_pass` | KBZPay / WavePay vs Play Billing decision + merchant accounts. The paywall still activates a **local mock** pass; the server ignores it, so scans past 3/day are refused | 4 |
| CAPTCHA on anonymous sign-in | Turnstile/hCaptcha keys + app widget | 5 |
| Monitoring | Sentry for the app; alert on `scans.cost_usd` and failed scans | 5 |
| Photos on other phones | Meals restored on another phone show the dish photo, not the meal photo (signed URLs) | later |
| Clean-up of abandoned anonymous accounts | Needs an "last active" signal first (token refresh doesn't record one) | later |
| Privacy policy | health data stored in Singapore; Supabase and Anthropic as processors; meal photos kept until the account is deleted | before launch |
| Verified dish data | nutritionist sets `verified_by` / `verified_at` in Studio | ongoing |

## Risks

SMS delivery to Myanmar numbers · Google Play rules on outside payments · scan accuracy on local dishes · anonymous-account abuse for free scans (each new install gets 3/day for a week; CAPTCHA + budget cap mitigate) · slow/expensive data (photos ~100 KB, queued and retried).
