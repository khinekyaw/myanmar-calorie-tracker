import type { CustomFood, MealItem } from '@/domain/meal';
import type { DishId } from '@/data/dishes';
import type { LogEntry, ScanCandidate } from '@/store/log';

import { db, enqueue, newId, nowIso } from './database';

/** Food logs + their items, stored as one unit (synced together). */

type LogRow = {
  id: string;
  eaten_at: string;
  source: LogEntry['source'];
  status: LogEntry['status'];
  photo_path: string | null;
  is_shared_meal: number;
  confidence: number | null;
  candidates: string | null;
  remote_photo: string | null;
};

type ItemRow = {
  log_id: string;
  dish_id: string;
  qty: number;
  oil: string | null;
  sweetness: string | null;
  /** JSON: CustomFood */
  custom: string | null;
};

export function loadLogs(): LogEntry[] {
  const logs = db.getAllSync<LogRow>('SELECT * FROM food_logs WHERE deleted_at IS NULL ORDER BY eaten_at DESC');
  const items = db.getAllSync<ItemRow>(
    `SELECT log_items.* FROM log_items JOIN food_logs ON food_logs.id = log_items.log_id
     WHERE food_logs.deleted_at IS NULL ORDER BY log_items.position`,
  );
  const byLog = new Map<string, MealItem[]>();
  for (const it of items) {
    const list = byLog.get(it.log_id) ?? [];
    list.push({
      dishId: it.dish_id as DishId,
      qty: it.qty,
      ...(it.oil && { oil: it.oil as MealItem['oil'] }),
      ...(it.sweetness && { sweetness: it.sweetness as MealItem['sweetness'] }),
      ...(it.custom && { custom: JSON.parse(it.custom) as CustomFood }),
    });
    byLog.set(it.log_id, list);
  }
  return logs.map((r) => ({
    id: r.id,
    eatenAt: new Date(r.eaten_at),
    source: r.source,
    // A scan cut off by closing the app goes back to the queue.
    status: r.status === 'analyzing' ? 'queued' : r.status,
    items: byLog.get(r.id) ?? [],
    ...(r.photo_path && { photoUri: r.photo_path }),
    ...(r.is_shared_meal && { isSharedMeal: true }),
    ...(r.confidence !== null && { confidence: r.confidence }),
    ...(r.candidates && { candidates: JSON.parse(r.candidates) as ScanCandidate[] }),
    ...(r.remote_photo && { remotePhoto: r.remote_photo }),
  }));
}

export function saveLog(e: LogEntry) {
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO food_logs (id, eaten_at, source, status, photo_path, is_shared_meal, confidence, candidates, remote_photo, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET eaten_at = excluded.eaten_at, source = excluded.source, status = excluded.status,
         photo_path = excluded.photo_path, is_shared_meal = excluded.is_shared_meal, confidence = excluded.confidence,
         candidates = excluded.candidates, remote_photo = excluded.remote_photo, updated_at = excluded.updated_at`,
      e.id,
      e.eatenAt.toISOString(),
      e.source,
      e.status,
      e.photoUri ?? null,
      e.isSharedMeal ? 1 : 0,
      e.confidence ?? null,
      e.candidates ? JSON.stringify(e.candidates) : null,
      e.remotePhoto ?? null,
      nowIso(),
    );
    db.runSync('DELETE FROM log_items WHERE log_id = ?', e.id);
    e.items.forEach((it, position) =>
      db.runSync(
        'INSERT INTO log_items (id, log_id, position, dish_id, qty, oil, sweetness, custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        newId(),
        e.id,
        position,
        it.dishId,
        it.qty,
        it.oil ?? null,
        it.sweetness ?? null,
        it.custom ? JSON.stringify(it.custom) : null,
      ),
    );
    enqueue('food_log', e.id, 'upsert');
  });
}

/** Soft delete: the tombstone syncs, then the server can drop the row. */
export function deleteLog(id: string) {
  db.withTransactionSync(() => {
    db.runSync('UPDATE food_logs SET deleted_at = ?, updated_at = ? WHERE id = ?', nowIso(), nowIso(), id);
    enqueue('food_log', id, 'delete');
  });
}

export const countLogs = () => db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM food_logs')?.n ?? 0;
