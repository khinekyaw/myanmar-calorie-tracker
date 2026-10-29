import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { syncStorage } from '@/lib/storage';

/** One body measurement on a day (the `weights` table in the data model). */
export type Measurement = { day: string; weightLb?: number; waistIn?: number };

export type Metric = 'weight' | 'waist';

/** YYYY-MM-DD in local time. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromDayKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** ILLUSTRATIVE history: ~12 weeks, 145 → 138 lb, logged every few days. */
function seed(): Measurement[] {
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

type WeightsState = {
  entries: Measurement[];
  /** Adds or replaces today's (or `day`'s) value for one metric. */
  log: (metric: Metric, value: number, day?: string) => void;
};

export const useWeights = create<WeightsState>()(
  persist(
    (set) => ({
      entries: seed(),
      log: (metric, value, day = dayKey(new Date())) =>
        set((s) => {
          const field = metric === 'weight' ? 'weightLb' : 'waistIn';
          const existing = s.entries.find((e) => e.day === day);
          const entries = existing
            ? s.entries.map((e) => (e.day === day ? { ...e, [field]: value } : e))
            : [...s.entries, { day, [field]: value }];
          return { entries: entries.sort((a, b) => a.day.localeCompare(b.day)) };
        }),
    }),
    { name: 'weights', storage: syncStorage, version: 1 },
  ),
);

/** Points for one metric, oldest first. */
export function series(entries: Measurement[], metric: Metric) {
  const field = metric === 'weight' ? 'weightLb' : 'waistIn';
  return entries
    .filter((e) => e[field] !== undefined)
    .map((e) => ({ day: e.day, value: e[field] as number }));
}

export function useLatest(metric: Metric) {
  const entries = useWeights((s) => s.entries);
  const points = series(entries, metric);
  return points[points.length - 1];
}
