import { create } from 'zustand';

import { carbsToRicePlates, sumMacros, type MealItem } from '@/domain/meal';
import type { DishId } from '@/mocks/dishes';

import { usePlan } from './plan';

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

const at = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

let seq = 100;
const newId = () => `${Date.now()}-${seq++}`;

export const useLog = create<LogState>()((set) => ({
  entries: [
    { id: '3', eatenAt: at(12, 30), source: 'photo', status: 'done', items: [{ dishId: 'laphetThoke', qty: 1 }] },
    { id: '2', eatenAt: at(8, 10), source: 'quick', status: 'done', items: [{ dishId: 'tea', qty: 1, sweetness: 'pawSeint' }] },
    { id: '1', eatenAt: at(7, 40), source: 'photo', status: 'done', items: [{ dishId: 'mohinga', qty: 1 }] },
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

export function useDaySummary() {
  const entries = useLog((s) => s.entries);
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
