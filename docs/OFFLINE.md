# Sar AI — Offline-first design

The app works without a connection. The **on-phone SQLite database is the source of truth**; the server (see [BACKEND.md](BACKEND.md)) is where it syncs to, not where it lives.

## What works offline

| Feature | Offline | How |
|---|---|---|
| Log by voice / text, search, quick re-log | ✅ | Dish list and parser are on the phone |
| Photo scan | ⏳ queued | Photo shrunk to 800 px, kept in app storage, sent when back online (Wi-Fi only if set) |
| See / edit / delete meals, any day | ✅ | `food_logs` + `log_items` tables |
| Weight & waist, goal, plan, BMI, streak | ✅ | `weights` table + key-value settings |
| Food photos, fonts, logo, Welcome image | ✅ | Bundled in the app |
| Language, settings, Premium state, free-scan count | ✅ | Key-value store (SQLite) |
| Sign-in code, payments, deleting the account | ❌ by nature | Need a connection; nothing else is blocked |
| Sync | ⏳ queued | Changes wait in `outbox` and go up when online (any connection; only photos respect Wi-Fi only) |

Closing the app loses nothing, including photos still waiting in the queue. A scan interrupted mid-upload goes back to *Waiting* on the next launch.

## Storage

```
expo-sqlite  sarai.db
├─ food_logs   id (UUID) · eaten_at · source · status (queued|analyzing|done) · photo_path
│              · is_shared_meal · confidence · candidates (JSON) · remote_photo · updated_at · deleted_at
├─ log_items   id · log_id → food_logs · position · dish_id · qty · oil · sweetness
├─ weights     day (YYYY-MM-DD) · weight_lb · waist_in · updated_at · deleted_at
├─ dishes      id · data (JSON) · updated_at          ← catalogue, seeded from the bundled list
├─ outbox      seq · entity (food_log|weight|profile) · entity_id · op (upsert|delete) · created_at
└─ meta        key/value: catalogue_version, samples_v1, sync_user, sync_cursor, profile_updated_at

expo-sqlite/kv-store   settings · onboarding (profile) · plan · premium · scan-quota
expo-sqlite/localStorage   Supabase session
documents/meal-photos/ <log id>.jpg   (not the cache folder, which Android may clear)
```

Code: `src/db/` (database + migrations, food logs, weights, dishes, photos, init, sync), `src/sync/` (engine, profile, mapping). The zustand stores (`store/log.ts`, `store/weights.ts`) are **in-memory views**: they load from the database at startup and write every change to it first; sync reloads them after writing.

## Sync-ready rules (keep these when adding tables)

1. **IDs are made on the phone** (UUID v4), so rows created offline never clash with the server's.
2. **Every row has `updated_at`**; deletes set **`deleted_at`** (tombstone) instead of removing the row.
3. **Every change also inserts into `outbox`** in the same transaction.
4. A **food log and its items are one unit**: saving a log rewrites its items and enqueues one `food_log` upsert.
5. Schema changes go in `MIGRATIONS` in `src/db/database.ts` (`PRAGMA user_version`), never by editing an old migration. A synced column also needs a server migration and a line in `src/sync/mapping.ts`.
6. Rows that came **from** the server are written without an outbox entry (`src/db/sync.ts`), so they never bounce back.

## How sync works

`src/sync/engine.ts`, scheduled by `useSync()` in the root layout: on start, when the app comes to the foreground, when the connection returns, and 2 s after any change. One sync at a time; a failure retries after 5 s, 10 s, 20 s … up to 5 minutes.

1. **Account:** `ensureSession()` signs in anonymously if needed. If the account differs from `meta.sync_user` (first sync, signed in to an existing account, or the old one was deleted), everything is queued again and the cursor is cleared, so the account gets all of the phone's data.
2. **Push** (`sync_push`, up to 100 rows per call): the latest version of each changed row, read from the outbox (several changes to one row go up once). The server keeps whichever `updated_at` is newer and sends back its copy where it won, which the phone applies at once. Rows the server refuses as invalid come back in `rejected` and are dropped, so one bad row can't block the rest. Photos still waiting for their scan aren't sent until they have items (or are deleted).
3. **Pull** (`sync_pull`, pages of 500): rows written since `meta.sync_cursor`, plus the profile, Premium passes and today's scan count. Applied with the same rule (newest wins). The new cursor is saved only after the last page, so an interrupted pull simply repeats. The server re-reads the last 2 minutes on every pull so a write that was still committing during the previous pull isn't missed; reading a row twice is harmless.
4. **Profile:** onboarding answers, language, Uposatha and plan targets are watched in the stores; a change sets `meta.profile_updated_at` and queues `profile`. A half-finished onboarding is never sent, and a phone without a finished profile always takes the server's (restoring an account on a new phone).
5. **Catalogue:** dishes come down with the pull; the server's copy always wins. Retired dishes stay (old meals use them) but leave search.
6. **Units:** the phone stores lb / in / ft+in; the server kg / cm, rounded so values survive the round trip (`src/sync/mapping.ts`, tested).
7. **Photos:** uploaded once to `meal-photos/<user id>/<log id>.jpg` before the scan (`remote_photo` remembers it); retries reuse it.
8. **Account gone:** if the server says the account no longer exists, the phone signs out locally and starts over with a new anonymous account; nothing on the phone is lost.

Settings → Developer shows **"Changes waiting to sync"** (rows in the outbox) and **"Sync now"**.

## Testing offline

- Dev builds: Settings → Developer → **Simulate offline**, take a photo, close and reopen the app: the photo is still *Waiting*. Turn it off and it's sent.
- Release build: `npx expo run:android --variant release`, then airplane mode. Everything above works except scan, sign-in and payments. *(Not yet run; the production bundle was checked with `npx expo export` and contains all 60 assets with no remote URLs.)*

## Sample data

A fresh install of a **development build** gets illustrative history (6 days of meals, ~12 weeks of weight), written to the database once (`mocks/samples.ts`, flag `samples_v1`). Release builds start empty. With a backend configured, the samples sync like any other data.
