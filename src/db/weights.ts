import type { Measurement } from '@/store/weights';

import { db, enqueue, nowIso } from './database';

/** Weight / waist per day (imperial on the phone; converted to kg/cm when synced). */

type Row = { day: string; weight_lb: number | null; waist_in: number | null };

export function loadWeights(): Measurement[] {
  return db
    .getAllSync<Row>('SELECT day, weight_lb, waist_in FROM weights WHERE deleted_at IS NULL ORDER BY day')
    .map((r) => ({
      day: r.day,
      ...(r.weight_lb !== null && { weightLb: r.weight_lb }),
      ...(r.waist_in !== null && { waistIn: r.waist_in }),
    }));
}

export function saveWeight(m: Measurement) {
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO weights (day, weight_lb, waist_in, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(day) DO UPDATE SET weight_lb = excluded.weight_lb, waist_in = excluded.waist_in,
         updated_at = excluded.updated_at, deleted_at = NULL`,
      m.day,
      m.weightLb ?? null,
      m.waistIn ?? null,
      nowIso(),
    );
    enqueue('weight', m.day, 'upsert');
  });
}

export const countWeights = () => db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM weights')?.n ?? 0;
