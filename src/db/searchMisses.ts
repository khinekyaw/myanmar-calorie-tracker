import { db, enqueue, newId, nowIso } from './database';

/**
 * Searches that found nothing: the dishes to add next (docs/CATALOGUE.md →
 * "What's missing"). Kept on the phone until sync sends them, then deleted.
 */

const MAX_QUERY = 80;

export type SearchMiss = { id: string; query: string; created_at: string };

export function recordSearchMiss(query: string) {
  const q = query.trim().slice(0, MAX_QUERY);
  if (!q) return;
  db.withTransactionSync(() => {
    // The same search again before it was sent adds nothing.
    if (db.getFirstSync('SELECT 1 FROM search_misses WHERE query = ?', q)) return;
    const id = newId();
    db.runSync('INSERT INTO search_misses (id, query, created_at) VALUES (?, ?, ?)', id, q, nowIso());
    enqueue('search_miss', id, 'upsert');
  });
}

const placeholders = (n: number) => Array.from({ length: n }, () => '?').join(', ');

export function missesForPush(ids: string[]): SearchMiss[] {
  if (!ids.length) return [];
  return db.getAllSync<SearchMiss>(
    `SELECT id, query, created_at FROM search_misses WHERE id IN (${placeholders(ids.length)})`,
    ...ids,
  );
}

/** Sent: the server has them now. */
export function forgetMisses(ids: string[]) {
  if (!ids.length) return;
  db.runSync(`DELETE FROM search_misses WHERE id IN (${placeholders(ids.length)})`, ...ids);
}
