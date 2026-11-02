import { openDatabaseSync } from 'expo-sqlite';

/**
 * On-phone database: the source of truth for everything the user logs.
 * Offline-first and sync-ready (see docs/OFFLINE.md):
 *  - ids are created on the phone (UUID), so offline rows never clash;
 *  - every row has `updated_at`, and deletes set `deleted_at` (tombstones);
 *  - every change is also written to `outbox`, which the sync engine pushes.
 *
 * Sync calls are used on purpose: the data is small and this lets the stores
 * load before the first render.
 */
export const db = openDatabaseSync('sarai.db');

const MIGRATIONS: string[] = [
  // 1 — initial schema
  `
  CREATE TABLE food_logs (
    id TEXT PRIMARY KEY NOT NULL,
    eaten_at TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    photo_path TEXT,
    is_shared_meal INTEGER NOT NULL DEFAULT 0,
    confidence REAL,
    candidates TEXT,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX food_logs_eaten_at ON food_logs (eaten_at);
  CREATE TABLE log_items (
    id TEXT PRIMARY KEY NOT NULL,
    log_id TEXT NOT NULL REFERENCES food_logs (id),
    position INTEGER NOT NULL,
    dish_id TEXT NOT NULL,
    qty REAL NOT NULL,
    oil TEXT,
    sweetness TEXT
  );
  CREATE INDEX log_items_log_id ON log_items (log_id);
  CREATE TABLE weights (
    day TEXT PRIMARY KEY NOT NULL,
    weight_lb REAL,
    waist_in REAL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE TABLE dishes (
    id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE outbox (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    op TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);
  `,
  // 2 — where the photo is stored on the server (meal-photos/<user id>/<log id>.jpg)
  `
  ALTER TABLE food_logs ADD COLUMN remote_photo TEXT;
  `,
  // 3 — foods not on the list (JSON: name + estimated numbers) and searches that found nothing
  `
  ALTER TABLE log_items ADD COLUMN custom TEXT;
  CREATE TABLE search_misses (
    id TEXT PRIMARY KEY NOT NULL,
    query TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  `,
];

function migrate() {
  db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[v]);
      db.execSync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

migrate();

export const nowIso = () => new Date().toISOString();

/** UUID v4 for rows created on the phone. */
export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * `profile` has one row ("me"): onboarding answers, preferences and plan.
 * `search_miss` rows are sent once and then deleted (db/searchMisses.ts).
 */
export type Entity = 'food_log' | 'weight' | 'profile' | 'search_miss';

const outboxListeners = new Set<() => void>();

/** Called after every change is queued (the sync engine pushes soon after). */
export function onOutboxChange(listener: () => void) {
  outboxListeners.add(listener);
  return () => {
    outboxListeners.delete(listener);
  };
}

/** Record a change for the sync engine to push later. */
export function enqueue(entity: Entity, entityId: string, op: 'upsert' | 'delete') {
  db.runSync('INSERT INTO outbox (entity, entity_id, op, created_at) VALUES (?, ?, ?, ?)', entity, entityId, op, nowIso());
  outboxListeners.forEach((listener) => listener());
}

export function getMeta(key: string): string | null {
  return db.getFirstSync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key)?.value ?? null;
}

export function setMeta(key: string, value: string) {
  db.runSync('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

/** Rows with changes not yet sent to the server (shown in Settings → Developer). */
export const pendingSyncCount = () =>
  db.getFirstSync<{ n: number }>('SELECT COUNT(DISTINCT entity || entity_id) AS n FROM outbox')?.n ?? 0;
