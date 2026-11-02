import { Directory, Paths } from 'expo-file-system';

import { isNewer, logFromServer, weightFromServer, type LocalItemRow, type LocalLogRow, type LocalWeightRow, type ServerLog, type ServerWeight } from '@/sync/mapping';

import { db, newId, nowIso, setMeta, type Entity } from './database';

/**
 * The phone's side of sync (docs/OFFLINE.md → "How sync works"): reading the
 * outbox and the rows it points to, and writing rows that came from the
 * server. Server rows are written WITHOUT an outbox entry, so they never
 * bounce back.
 */

export type PendingChange = { entity: Entity; entity_id: string; seq: number };

/** Rows with unsent changes, oldest first; `seq` is the latest change to each. */
export function pendingChanges(limit: number): PendingChange[] {
  return db.getAllSync<PendingChange>(
    `SELECT entity, entity_id, MAX(seq) AS seq FROM outbox
     GROUP BY entity, entity_id ORDER BY MIN(seq) LIMIT ?`,
    limit,
  );
}

/** Forget changes that were sent. A change made while sending (higher seq) stays queued. */
export function markSent(changes: PendingChange[]) {
  db.withTransactionSync(() => {
    for (const c of changes) {
      db.runSync('DELETE FROM outbox WHERE entity = ? AND entity_id = ? AND seq <= ?', c.entity, c.entity_id, c.seq);
    }
  });
}

const placeholders = (n: number) => Array.from({ length: n }, () => '?').join(', ');

export function logsForPush(ids: string[]): { row: LocalLogRow; items: LocalItemRow[] }[] {
  if (!ids.length) return [];
  const rows = db.getAllSync<LocalLogRow>(
    `SELECT id, eaten_at, source, status, remote_photo, is_shared_meal, confidence, candidates, updated_at, deleted_at
     FROM food_logs WHERE id IN (${placeholders(ids.length)})`,
    ...ids,
  );
  const items = db.getAllSync<LocalItemRow & { log_id: string }>(
    `SELECT log_id, dish_id, qty, oil, sweetness, custom FROM log_items
     WHERE log_id IN (${placeholders(ids.length)}) ORDER BY log_id, position`,
    ...ids,
  );
  return rows.map((row) => ({ row, items: items.filter((i) => i.log_id === row.id) }));
}

export function weightsForPush(days: string[]): LocalWeightRow[] {
  if (!days.length) return [];
  return db.getAllSync<LocalWeightRow>(
    `SELECT day, weight_lb, waist_in, updated_at, deleted_at FROM weights WHERE day IN (${placeholders(days.length)})`,
    ...days,
  );
}

/** Write meals from the server where they are newer. Returns how many changed. */
export function saveRemoteLogs(list: ServerLog[]): number {
  let changed = 0;
  db.withTransactionSync(() => {
    for (const server of list) {
      const local = db.getFirstSync<{ updated_at: string; remote_photo: string | null }>(
        'SELECT updated_at, remote_photo FROM food_logs WHERE id = ?',
        server.id,
      );
      if (local && !isNewer(server.updated_at, local.updated_at)) {
        if (server.photo_path && !local.remote_photo) {
          db.runSync('UPDATE food_logs SET remote_photo = ? WHERE id = ?', server.photo_path, server.id);
        }
        continue;
      }
      const { row, items } = logFromServer(server);
      // `photo_path` is the local file and only exists on the phone that took it.
      db.runSync(
        `INSERT INTO food_logs (id, eaten_at, source, status, is_shared_meal, confidence, candidates, remote_photo, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET eaten_at = excluded.eaten_at, source = excluded.source, status = excluded.status,
           is_shared_meal = excluded.is_shared_meal, confidence = excluded.confidence, candidates = excluded.candidates,
           remote_photo = COALESCE(excluded.remote_photo, food_logs.remote_photo), updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        row.id,
        row.eaten_at,
        row.source,
        row.status,
        row.is_shared_meal,
        row.confidence,
        row.candidates,
        row.remote_photo,
        row.updated_at,
        row.deleted_at,
      );
      db.runSync('DELETE FROM log_items WHERE log_id = ?', row.id);
      items.forEach((it, position) =>
        db.runSync(
          'INSERT INTO log_items (id, log_id, position, dish_id, qty, oil, sweetness, custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          newId(),
          row.id,
          position,
          it.dish_id,
          it.qty,
          it.oil,
          it.sweetness,
          it.custom,
        ),
      );
      changed += 1;
    }
  });
  return changed;
}

/** Write weights from the server where they are newer. Returns how many changed. */
export function saveRemoteWeights(list: ServerWeight[]): number {
  let changed = 0;
  db.withTransactionSync(() => {
    for (const server of list) {
      const local = db.getFirstSync<{ updated_at: string }>('SELECT updated_at FROM weights WHERE day = ?', server.day);
      if (local && !isNewer(server.updated_at, local.updated_at)) continue;
      const row = weightFromServer(server);
      db.runSync(
        `INSERT INTO weights (day, weight_lb, waist_in, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(day) DO UPDATE SET weight_lb = excluded.weight_lb, waist_in = excluded.waist_in,
           updated_at = excluded.updated_at, deleted_at = excluded.deleted_at`,
        row.day,
        row.weight_lb,
        row.waist_in,
        row.updated_at,
        row.deleted_at,
      );
      changed += 1;
    }
  });
  return changed;
}

/**
 * The phone is now synced to a different account (first sync, sign-in to an
 * existing account, or the old anonymous account is gone): send everything
 * again. Photo paths pointed into the old account's folder, so they go.
 */
export function startOverForUser(userId: string) {
  const now = nowIso();
  db.withTransactionSync(() => {
    db.runSync('UPDATE food_logs SET remote_photo = NULL');
    db.runSync(
      `INSERT INTO outbox (entity, entity_id, op, created_at)
       SELECT 'food_log', id, CASE WHEN deleted_at IS NULL THEN 'upsert' ELSE 'delete' END, ? FROM food_logs`,
      now,
    );
    db.runSync(
      `INSERT INTO outbox (entity, entity_id, op, created_at)
       SELECT 'weight', day, CASE WHEN deleted_at IS NULL THEN 'upsert' ELSE 'delete' END, ? FROM weights`,
      now,
    );
    db.runSync(`INSERT INTO outbox (entity, entity_id, op, created_at) VALUES ('profile', 'me', 'upsert', ?)`, now);
    db.runSync(`DELETE FROM meta WHERE key = 'sync_cursor'`);
    setMeta('sync_user', userId);
  });
}

/** After the account is deleted: remove everything the user logged from this phone. */
export function wipeUserData() {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM log_items');
    db.runSync('DELETE FROM food_logs');
    db.runSync('DELETE FROM search_misses');
    db.runSync('DELETE FROM weights');
    db.runSync('DELETE FROM outbox');
    db.runSync(`DELETE FROM meta WHERE key IN ('sync_user', 'sync_cursor', 'profile_updated_at')`);
  });
  const photos = new Directory(Paths.document, 'meal-photos');
  if (photos.exists) photos.delete();
}
