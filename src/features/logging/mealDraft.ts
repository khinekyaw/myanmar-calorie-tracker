import { create } from 'zustand';

import type { MealItem } from '@/domain/meal';

/**
 * Unsaved edits to one meal in the shared-meal editor, including dishes added
 * through Search "+". Nothing reaches the meal until Save; leaving the editor
 * drops the draft. In memory only.
 */
type MealDraft = {
  /** Meal being edited, or null when no editor is open. */
  id: string | null;
  items: MealItem[];
  start: (id: string, items: MealItem[]) => void;
  setItems: (items: MealItem[]) => void;
  /** Add a dish, or replace it when it's already in the draft (scanned foods not on the list stay). */
  put: (item: MealItem) => void;
  clear: () => void;
};

export const useMealDraft = create<MealDraft>()((set) => ({
  id: null,
  items: [],
  start: (id, items) => set({ id, items }),
  setItems: (items) => set({ items }),
  put: (item) => set((s) => ({ items: [...s.items.filter((i) => i.custom || i.dishId !== item.dishId), item] })),
  clear: () => set({ id: null, items: [] }),
}));
