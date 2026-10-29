import { create } from 'zustand';

import { carbsToRicePlates, sumMacros, type MealItem } from '@/domain/meal';
import type { DishId } from '@/mocks/dishes';

import { streakDays } from '@/domain/streak';

import { usePlan } from './plan';
import { useSettings } from './settings';
import { dayKey } from './weights';

/**
 * Today's food log. In-memory for the UI prototype; the real version is
 * the offline-first SQLite queue in docs/ARCHITECTURE.md (food_logs + log_items).
 */

export type LogSource = 'photo' | 'voice' | 'text' | 'search' | 'quick';

/**
 * queued    – photo saved locally, waiting for a connection (or Wi-Fi)
 * analyzing – sent to the scan function, waiting for the answer
 * done      – items known (from the scan or entered by hand)
 */
export type LogStatus = 'queued' | 'analyzing' | 'done';

export type ScanCandidate = { dishId: DishId; confidence: number };

export type LogEntry = {
  id: string;
  eatenAt: Date;
  source: LogSource;
  status: LogStatus;
  items: MealItem[];
  photoUri?: string;
  isSharedMeal?: boolean;
  /** Top candidates from the scan, for PickDish. */
  candidates?: ScanCandidate[];
  confidence?: number;
};

type LogState = {
  entries: LogEntry[];
  addEntry: (entry: Omit<LogEntry, 'id' | 'eatenAt'> & { eatenAt?: Date }) => string;
  updateEntry: (id: string, patch: Partial<LogEntry>) => void;
  removeEntry: (id: string) => void;
  quickAdd: (dishId: DishId) => void;
};

const at = (h: number, m: number, daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d;
};

/** ILLUSTRATIVE history for the last 6 days, so the week strip and charts have data. */
const HISTORY: [DishId, number, number][][] = [
  [['mohinga', 7, 30], ['tea', 10, 0], ['riceCurry', 19, 0]],
  [['palata', 8, 0], ['tea', 8, 5], ['riceCurry', 13, 0], ['riceCurry', 19, 30]],
  [['nanbyaPePyote', 7, 45], ['laphetThoke', 15, 0], ['riceCurry', 19, 15]],
  [['mohinga', 7, 20], ['tea', 16, 0], ['samusa', 16, 5], ['riceCurry', 19, 0]],
  [['palata', 8, 30], ['riceCurry', 12, 45], ['riceCurry', 20, 0]],
  [['mohinga', 7, 50], ['tea', 9, 30], ['riceCurry', 18, 45]],
];

const history: LogEntry[] = HISTORY.flatMap((day, i) =>
  day.map(([dishId, h, m], j) => ({
    id: `h${i}-${j}`,
    eatenAt: at(h, m, i + 1),
    source: 'photo' as const,
    status: 'done' as const,
    items: [{ dishId, qty: 1 }],
  })),
);

let seq = 100;
const newId = () => `${Date.now()}-${seq++}`;

export const useLog = create<LogState>()((set) => ({
  entries: [
    { id: '3', eatenAt: at(12, 30), source: 'photo', status: 'done', items: [{ dishId: 'laphetThoke', qty: 1 }] },
    { id: '2', eatenAt: at(8, 10), source: 'quick', status: 'done', items: [{ dishId: 'tea', qty: 1, sweetness: 'pawSeint' }] },
    { id: '1', eatenAt: at(7, 40), source: 'photo', status: 'done', items: [{ dishId: 'mohinga', qty: 1 }] },
    ...history,
  ],
  addEntry: (entry) => {
    const id = newId();
    set((s) => ({ entries: [{ ...entry, id, eatenAt: entry.eatenAt ?? new Date() }, ...s.entries] }));
    return id;
  },
  updateEntry: (id, patch) =>
    set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
  quickAdd: (dishId) =>
    set((s) => ({
      entries: [
        { id: newId(), eatenAt: new Date(), source: 'quick', status: 'done', items: [{ dishId, qty: 1 }] },
        ...s.entries,
      ],
    })),
}));

export const useEntry = (id: string | undefined) => useLog((s) => s.entries.find((e) => e.id === id));

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export const entriesOn = (entries: LogEntry[], day: Date) => entries.filter((e) => sameDay(e.eatenAt, day));

/** kcal eaten on a day (done entries only). */
export const kcalOn = (entries: LogEntry[], day: Date) =>
  sumMacros(entriesOn(entries, day).filter((e) => e.status === 'done').flatMap((e) => e.items)).kcal;

/** Totals and "left" values for one day (default today). */
export function useDaySummary(day: Date = new Date()) {
  const all = useLog((s) => s.entries);
  const entries = entriesOn(all, day);
  const targets = usePlan((s) => s.plan);
  const eaten = sumMacros(entries.filter((e) => e.status === 'done').flatMap((e) => e.items));
  const ricePlatesEaten = carbsToRicePlates(eaten.carbG);
  return {
    entries,
    kcalLeft: Math.max(Math.round(targets.kcal - eaten.kcal), 0),
    kcalOver: Math.max(Math.round(eaten.kcal - targets.kcal), 0),
    kcalProgress: eaten.kcal / targets.kcal,
    ricePlatesLeft: Math.max(Math.round((targets.ricePlates - ricePlatesEaten) * 2) / 2, 0),
    riceProgress: ricePlatesEaten / targets.ricePlates,
    proteinLeft: Math.max(Math.round(targets.proteinG - eaten.proteinG), 0),
    proteinProgress: eaten.proteinG / targets.proteinG,
    fatLeft: Math.max(Math.round(targets.fatG - eaten.fatG), 0),
    fatProgress: eaten.fatG / targets.fatG,
  };
}

/** Current logging streak (feast days count as logged). */
export function useStreak() {
  const entries = useLog((s) => s.entries);
  const feastToday = useSettings((s) => s.feastDay);
  const today = new Date();
  const logged = new Set(entries.filter((e) => e.status === 'done').map((e) => dayKey(e.eatenAt)));
  return streakDays(logged, new Set(feastToday ? [dayKey(today)] : []), today, dayKey);
}
