# Sar AI — Backend plan

Status: **planned, not started.** Agreed 2026-10-30. Start with Phase 1 in a new session.

## Decisions

- **Supabase, hosted** (Singapore region): Postgres, Auth, Storage, Edge Functions. Not self-hosted: backups, patches, security and uptime would be our job, and hosting in Myanmar is unreliable (power and internet shutdowns). Revisit only if law or cost requires it.
- **Languages:** SQL (schema, migrations, row-level security, a few database functions) and **TypeScript** Edge Functions (Deno). App stays TypeScript with `@supabase/supabase-js`. No separate Node/Python server.
- **Offline-first stays:** the phone database is the source of truth ([OFFLINE.md](OFFLINE.md)); the server is the sync target.
- **Lock-in is low:** everything lives in the repo as migrations and functions (`supabase/` folder); underneath it's plain Postgres.

## Environments

| Environment | Where |
|---|---|
| Development | Supabase CLI in Docker on the Mac (`supabase start`) |
| Staging | Second hosted project (free tier) |
| Production | Hosted Supabase, Singapore, paid plan with backups |

## Pieces

**Database:** tables from the product brief §5 — `profiles`, `dishes`, `food_logs`, `log_items`, `weights`, `passes`, `scan_quota`, `day_flags` — mirroring the phone tables, plus `updated_at` / `deleted_at` for sync. **Row-level security:** users read and write only their own rows; `dishes` are read-only for everyone.

**Auth:** phone OTP (+95) first, Google second. "Skip" users get an **anonymous** account so their data syncs; it's linked to their phone when they sign in.

**Storage:** private `meal-photos/<user id>/…`, public `dish-photos/` (CDN).

**Edge Functions (TypeScript):**
- `scan` — verify the user → use one free scan (SQL function, atomic; skipped for Premium) → photo + candidate dish list to a Claude vision model → validate the JSON (`ScanResponse` in `src/services/scan.ts`) → swap in verified dish numbers → save `food_logs` + `log_items` → return the response.
- `payments` — receive KBZPay / WavePay (or Google Play) confirmations → create a `passes` row. The app never grants Premium itself.

**Sync** (in the app): push `outbox`, pull changes since `last_pulled_at`, newest `updated_at` wins, tombstones for deletes, kg/cm on the server ([OFFLINE.md → How sync will work](OFFLINE.md#how-sync-will-work-next-backend-session)).

**Admin:** nutritionist edits `dishes` in Supabase Studio (with `verified_by`); a small admin page later.

**Monitoring:** Sentry for the app; Supabase logs; AI cost per scan recorded.

## Phases

1. **Local foundation** — `supabase/` migrations (schema + RLS), seed dishes, local stack in Docker, sync engine in the app against it. *Needs nothing from outside.*
2. **Real scanning** — `scan` function with Claude, server-side quota, accuracy test on ~100 labelled Myanmar meal photos to choose the model size.
3. **Sign-in** — phone OTP + Google, anonymous → linked accounts.
4. **Payments** — passes created by the server only.
5. **Hosted & monitored** — production project, Sentry, Play internal testing.

## Needed from the team

| Item | Phase |
|---|---|
| Anthropic API key | 2 |
| ~100 labelled Myanmar meal photos | 2 |
| Supabase account (staging + production) | 2–3 |
| SMS provider account; test delivery to +95 early | 3 |
| Google Cloud OAuth client | 3 |
| Decision KBZPay / WavePay vs Play Billing + merchant accounts | 4 |
| Privacy policy (health data stored in Singapore; Supabase and Anthropic as processors) | Before launch |
| Verified dish data from the nutritionist | Ongoing |

## Risks

SMS delivery to Myanmar numbers · Google Play rules on outside payments · scan accuracy on local dishes · slow/expensive data (photos compressed and queued; uploads must be retried until they succeed).
