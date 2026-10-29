import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { syncStorage } from '@/lib/storage';

/**
 * Prepaid Premium pass (the `passes` table). MOCK: activated straight from
 * the paywall until KBZPay / WavePay (or Play Billing) is connected.
 */
type PremiumState = {
  /** ISO date the current pass ends, or null. */
  activeUntil: string | null;
  activate: (months: number) => void;
  cancel: () => void;
};

export const usePremium = create<PremiumState>()(
  persist(
    (set) => ({
      activeUntil: null,
      activate: (months) =>
        set((s) => {
          // A new pass extends an active one (prepaid, no auto-renew).
          const from = s.activeUntil && new Date(s.activeUntil) > new Date() ? new Date(s.activeUntil) : new Date();
          from.setMonth(from.getMonth() + months);
          return { activeUntil: from.toISOString() };
        }),
      cancel: () => set({ activeUntil: null }),
    }),
    { name: 'premium', storage: syncStorage, version: 1 },
  ),
);

export const useIsPremium = () =>
  usePremium((s) => s.activeUntil !== null && new Date(s.activeUntil).getTime() > Date.now());
