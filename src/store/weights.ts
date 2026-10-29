import { create } from 'zustand';

import { initDatabase } from '@/db/init';
import { loadWeights, saveWeight } from '@/db/weights';
import { dayKey } from '@/lib/dates';

/** One body measurement on a day (the `weights` table in the data model). */
export type Measurement = { day: string; weightLb?: number; waistIn?: number };

export type Metric = 'weight' | 'waist';

export { dayKey, fromDayKey } from '@/lib/dates';

type WeightsState = {
  entries: Measurement[];
  /** Adds or replaces today's (or `day`'s) value for one metric. */
  log: (metric: Metric, value: number, day?: string) => void;
};

/** In-memory view of the weights table (the on-phone database is the source of truth). */
export const useWeights = create<WeightsState>()((set, get) => ({
  entries: (initDatabase(), loadWeights()),
  log: (metric, value, day = dayKey(new Date())) => {
    const field = metric === 'weight' ? 'weightLb' : 'waistIn';
    const existing = get().entries.find((e) => e.day === day);
    const next: Measurement = { ...(existing ?? { day }), [field]: value };
    saveWeight(next);
    set((s) => ({
      entries: (existing ? s.entries.map((e) => (e.day === day ? next : e)) : [...s.entries, next]).sort((a, b) =>
        a.day.localeCompare(b.day),
      ),
    }));
  },
}));

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
