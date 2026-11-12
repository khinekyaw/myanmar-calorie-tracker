import { create } from 'zustand';

import { sumSugarSodium } from '@/domain/health';
import { carbsToRicePlates, sumMacros, type MealItem } from '@/domain/meal';
import type { DishId } from '@/data/dishes';

import { initDatabase } from '@/db/init';
import { newId } from '@/db/database';
import { deleteLog, loadLogs, saveLog } from '@/db/foodLogs';
import { deletePhoto } from '@/db/photos';
import { streakDays } from '@/domain/streak';

import { usePlan } from './plan';
import { useScanQuota } from './scanQuota';
import { useSettings } from './settings';
import { dayKey } from './weights';

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
  /** Where the photo is on the server, once uploaded for the scan. */
  remotePhoto?: string;
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
  /** Re-read the database after sync wrote to it. */
  reload: () => void;
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
    // Logged by words before the photo was sent: its scan is never used.
    if (patch.status === 'done' && neverSent(current)) useScanQuota.getState().release();
    const next = { ...current, ...patch };
    saveLog(next);
    set((s) => ({ entries: s.entries.map((e) => (e.id === id ? next : e)) }));
  },
  removeEntry: (id) => {
    const current = get().entries.find((e) => e.id === id);
    if (current && neverSent(current)) useScanQuota.getState().release();
    deleteLog(id);
    deletePhoto(current?.photoUri);
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },
  quickAdd: (dishId) => {
    get().addEntry({ source: 'quick', status: 'done', items: [{ dishId, qty: 1 }] });
  },
  reload: () => {
    // A scan in flight is only "analyzing" in memory (the database copy reads
    // back as queued), so keep those entries as they are.
    const inFlight = new Map(get().entries.filter((e) => e.status === 'analyzing').map((e) => [e.id, e]));
    set({ entries: loadLogs().map((e) => inFlight.get(e.id) ?? e) });
  },
}));

/**
 * A photo from today still waiting to be sent: the camera counted a free scan
 * for it, but the server hasn't (a failed attempt is refunded there too).
 */
function neverSent(e: LogEntry) {
  return e.source === 'photo' && e.status === 'queued' && e.eatenAt.toDateString() === new Date().toDateString();
}

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
  const items = entries.filter((e) => e.status === 'done').flatMap((e) => e.items);
  const eaten = sumMacros(items);
  const ricePlatesEaten = carbsToRicePlates(eaten.carbG);
  return {
    entries,
    kcalLeft: Math.max(Math.round(targets.kcal - eaten.kcal), 0),
    kcalOver: Math.max(Math.round(eaten.kcal - targets.kcal), 0),
    kcalProgress: eaten.kcal / targets.kcal,
    ricePlatesLeft: Math.max(Math.round((targets.ricePlates - ricePlatesEaten) * 2) / 2, 0),
    ricePlatesOver: Math.max(Math.round((ricePlatesEaten - targets.ricePlates) * 2) / 2, 0),
    riceProgress: ricePlatesEaten / targets.ricePlates,
    proteinLeft: Math.max(Math.round(targets.proteinG - eaten.proteinG), 0),
    proteinProgress: eaten.proteinG / targets.proteinG,
    fatLeft: Math.max(Math.round(targets.fatG - eaten.fatG), 0),
    fatProgress: eaten.fatG / targets.fatG,
    /** Blood pressure guidance: sodium eaten (mg). */
    sodiumMg: sumSugarSodium(items).sodiumMg,
  };
}

/** Current logging streak (feast days count as logged). */
export function useStreak() {
  const entries = useLog((s) => s.entries);
  const feastDays = useSettings((s) => s.feastDays);
  const logged = new Set(entries.filter((e) => e.status === 'done').map((e) => dayKey(e.eatenAt)));
  return streakDays(logged, new Set(feastDays), new Date(), dayKey);
}
