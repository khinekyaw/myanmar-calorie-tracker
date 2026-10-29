import { create } from 'zustand';

import { carbsToRicePlates, sumMacros, type MealItem } from '@/domain/meal';
import type { DishId } from '@/mocks/dishes';

import { initDatabase } from '@/db/init';
import { newId } from '@/db/database';
import { deleteLog, loadLogs, saveLog } from '@/db/foodLogs';
import { deletePhoto } from '@/db/photos';
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
  /** Pass `id` when it must be known first (e.g. to name the photo file). */
  addEntry: (entry: Omit<LogEntry, 'id' | 'eatenAt'> & { id?: string; eatenAt?: Date }) => string;
  updateEntry: (id: string, patch: Partial<LogEntry>) => void;
  removeEntry: (id: string) => void;
  quickAdd: (dishId: DishId) => void;
};

/**
 * In-memory view of the food log. The on-phone database is the source of
 * truth: every change is written there first (and queued for sync), so meals
 * and queued photos survive closing the app and work fully offline.
 */
export const useLog = create<LogState>()((set, get) => ({
  entries: (initDatabase(), loadLogs()),
  addEntry: (entry) => {
    const full: LogEntry = { ...entry, id: entry.id ?? newId(), eatenAt: entry.eatenAt ?? new Date() };
    saveLog(full);
    set((s) => ({ entries: [full, ...s.entries] }));
    return full.id;
  },
  updateEntry: (id, patch) => {
    const current = get().entries.find((e) => e.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    saveLog(next);
    set((s) => ({ entries: s.entries.map((e) => (e.id === id ? next : e)) }));
  },
  removeEntry: (id) => {
    const current = get().entries.find((e) => e.id === id);
    deleteLog(id);
    deletePhoto(current?.photoUri);
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },
  quickAdd: (dishId) => {
    get().addEntry({ source: 'quick', status: 'done', items: [{ dishId, qty: 1 }] });
  },
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
