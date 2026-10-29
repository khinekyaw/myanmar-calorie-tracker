import { create } from 'zustand';

import { KCAL_PER_RICE_PLATE } from '@/domain/nutrition';
import { dishes, type DishId } from '@/mocks/dishes';

/**
 * Today's food log. In-memory mock for the UI prototype; the real version
 * is the offline-first SQLite queue described in docs/ARCHITECTURE.md.
 */
export type LogEntry = { id: string; dishId: DishId; eatenAt: Date };

/** PLACEHOLDER daily targets until plan calculation is wired up. */
export const mockTargets = {
  kcal: 1935,
  ricePlates: 3.5,
  proteinG: 117,
  fatG: 72,
};

type LogState = {
  entries: LogEntry[];
  add: (dishId: DishId) => void;
};

const at = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export const useLog = create<LogState>()((set) => ({
  entries: [
    { id: '3', dishId: 'laphetThoke', eatenAt: at(12, 30) },
    { id: '2', dishId: 'tea', eatenAt: at(8, 10) },
    { id: '1', dishId: 'mohinga', eatenAt: at(7, 40) },
  ],
  add: (dishId) =>
    set((s) => ({ entries: [{ id: String(Date.now()), dishId, eatenAt: new Date() }, ...s.entries] })),
}));

export function useDaySummary() {
  const entries = useLog((s) => s.entries);
  const eaten = entries.reduce(
    (acc, e) => {
      const d = dishes[e.dishId];
      acc.kcal += d.kcal;
      acc.carbG += d.carbG;
      acc.proteinG += d.proteinG;
      acc.fatG += d.fatG;
      return acc;
    },
    { kcal: 0, carbG: 0, proteinG: 0, fatG: 0 },
  );
  const ricePlatesEaten = (eaten.carbG * 4) / KCAL_PER_RICE_PLATE;
  return {
    entries,
    kcalLeft: Math.max(mockTargets.kcal - eaten.kcal, 0),
    kcalProgress: eaten.kcal / mockTargets.kcal,
    ricePlatesLeft: Math.max(Math.round((mockTargets.ricePlates - ricePlatesEaten) * 2) / 2, 0),
    riceProgress: ricePlatesEaten / mockTargets.ricePlates,
    proteinLeft: Math.max(mockTargets.proteinG - eaten.proteinG, 0),
    proteinProgress: eaten.proteinG / mockTargets.proteinG,
    fatLeft: Math.max(mockTargets.fatG - eaten.fatG, 0),
    fatProgress: eaten.fatG / mockTargets.fatG,
  };
}
