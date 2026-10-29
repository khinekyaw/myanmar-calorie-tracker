import { newId } from '@/db/database';
import { dayKey } from '@/lib/dates';
import type { LogEntry } from '@/store/log';
import type { Measurement } from '@/store/weights';

import type { DishId } from './dishes';

/**
 * ILLUSTRATIVE data written to the on-phone database on first launch only,
 * so a fresh install has something to show. Remove before launch.
 */

const at = (h: number, m: number, daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d;
};

/** ILLUSTRATIVE history for the last 6 days, written to the database on first launch only. */
const HISTORY: [DishId, number, number][][] = [
  [['mohinga', 7, 30], ['tea', 10, 0], ['riceCurry', 19, 0]],
  [['palata', 8, 0], ['tea', 8, 5], ['riceCurry', 13, 0], ['riceCurry', 19, 30]],
  [['nanbyaPePyote', 7, 45], ['laphetThoke', 15, 0], ['riceCurry', 19, 15]],
  [['mohinga', 7, 20], ['tea', 16, 0], ['samusa', 16, 5], ['riceCurry', 19, 0]],
  [['palata', 8, 30], ['riceCurry', 12, 45], ['riceCurry', 20, 0]],
  [['mohinga', 7, 50], ['tea', 9, 30], ['riceCurry', 18, 45]],
];

export function sampleLogs(): LogEntry[] {
  const history = HISTORY.flatMap((day, i) =>
    day.map(([dishId, h, m]) => ({
      id: newId(),
      eatenAt: at(h, m, i + 1),
      source: 'photo' as const,
      status: 'done' as const,
      items: [{ dishId, qty: 1 }],
    })),
  );
  return [
    { id: newId(), eatenAt: at(12, 30), source: 'photo', status: 'done', items: [{ dishId: 'laphetThoke', qty: 1 }] },
    { id: newId(), eatenAt: at(8, 10), source: 'quick', status: 'done', items: [{ dishId: 'tea', qty: 1, sweetness: 'pawSeint' }] },
    { id: newId(), eatenAt: at(7, 40), source: 'photo', status: 'done', items: [{ dishId: 'mohinga', qty: 1 }] },
    ...history,
  ];
}

/** ILLUSTRATIVE history: ~12 weeks, 145 → 138 lb, logged every few days. */
export function sampleWeights(): Measurement[] {
  const out: Measurement[] = [];
  const today = new Date();
  for (let daysAgo = 84; daysAgo >= 1; daysAgo -= 3 + (daysAgo % 2)) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    const t = 1 - daysAgo / 84;
    const wobble = Math.sin(daysAgo / 4) * 0.6;
    out.push({
      day: dayKey(d),
      weightLb: Math.round((145 - 7 * t + wobble) * 10) / 10,
      ...(daysAgo % 14 < 3 && { waistIn: Math.round((33 - 1.8 * t) * 10) / 10 }),
    });
  }
  return out;
}
