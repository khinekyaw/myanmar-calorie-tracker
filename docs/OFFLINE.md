# Sar AI — Offline-first design

The app works without a connection. The **on-phone SQLite database is the source of truth**; the server (see [BACKEND.md](BACKEND.md)) will be where it syncs to, not where it lives.

## What works offline

| Feature | Offline | How |
|---|---|---|
| Log by voice / text, search, quick re-log | ✅ | Dish list and parser are on the phone |
| Photo scan | ⏳ queued | Photo shrunk to 800 px, kept in app storage, sent when back online (Wi-Fi only if set) |
| See / edit / delete meals, any day | ✅ | `food_logs` + `log_items` tables |
| Weight & waist, goal, plan, BMI, streak | ✅ | `weights` table + key-value settings |
| Food photos, fonts, logo, Welcome image | ✅ | Bundled in the app |
| Language, settings, Premium state, free-scan count | ✅ | Key-value store (SQLite) |
| Sign-in code, payments | ❌ by nature | Need a connection; nothing else is blocked |

Closing the app loses nothing, including photos still waiting in the queue. A scan interrupted mid-upload goes back to *Waiting* on the next launch.

## Storage

```
expo-sqlite  sarai.db
├─ food_logs   id (UUID) · eaten_at · source · status (queued|analyzing|done) · photo_path
│              · is_shared_meal · confidence · candidates (JSON) · updated_at · deleted_at
├─ log_items   id · log_id → food_logs · position · dish_id · qty · oil · sweetness
├─ weights     day (YYYY-MM-DD) · weight_lb · waist_in · updated_at · deleted_at
├─ dishes      id · data (JSON) · updated_at          ← catalogue, seeded from the bundled list
├─ outbox      seq · entity (food_log|weight) · entity_id · op (upsert|delete) · created_at
└─ meta        key/value: catalogue_version, samples_v1, (later) last_pulled_at

expo-sqlite/kv-store   settings · onboarding (profile) · plan · premium · scan-quota
documents/meal-photos/ <log id>.jpg   (not the cache folder, which Android may clear)
```

Code: `src/db/` (database + migrations, food logs, weights, dishes, photos, init). The zustand stores (`store/log.ts`, `store/weights.ts`) are **in-memory views**: they load from the database at startup and write every change to it first.

## Sync-ready rules (keep these when adding tables)

1. **IDs are made on the phone** (UUID v4), so rows created offline never clash with the server's.
2. **Every row has `updated_at`**; deletes set **`deleted_at`** (tombstone) instead of removing the row.
3. **Every change also inserts into `outbox`** in the same transaction.
4. A **food log and its items are one unit**: saving a log rewrites its items and enqueues one `food_log` upsert.
5. Schema changes go in `MIGRATIONS` in `src/db/database.ts` (`PRAGMA user_version`), never by editing an old migration.

## How sync will work (next: backend session)

1. **Push:** read `outbox` in order, send each entity's current row (or its tombstone) to Supabase, then delete those outbox rows. Retry with backoff, and only on Wi-Fi if the user chose that for photos.
2. **Pull:** ask for rows changed since `meta.last_pulled_at`, apply them locally (newest `updated_at` wins), and save the new `last_pulled_at`.
3. **Photos:** upload the file to Storage, then call the `scan` function with its path.
4. **Catalogue:** pull changed dishes into `dishes`, then reload the in-memory catalogue (`setCatalogue`).
5. Units: the phone stores lb / in; the server stores kg / cm (converted during sync).

Settings → Developer shows **"Changes waiting to sync"** (the outbox size).

## Testing offline

- Dev builds: Settings → Developer → **Simulate offline**, take a photo, close and reopen the app: the photo is still *Waiting*. Turn it off and it's sent.
- Release build: `npx expo run:android --variant release`, then airplane mode. Everything above works except scan, sign-in and payments. *(Not yet run; the production bundle was checked with `npx expo export` and contains all 60 assets with no remote URLs.)*

## Sample data

A fresh install gets illustrative history (6 days of meals, ~12 weeks of weight), written to the database once (`mocks/samples.ts`, flag `samples_v1`). Remove before launch.
