import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { syncStorage } from '@/lib/storage';

/**
 * Prepaid Premium pass. The real state comes from the server's `passes`
 * table (synced; only the server creates passes). MOCK: the paywall also
 * activates a local pass until KBZPay / WavePay (or Play Billing) is connected;
 * the server ignores it, so it only changes what the app shows.
 */
type PremiumState = {
  /** ISO date the mock (local) pass ends, or null. */
  activeUntil: string | null;
  /** ISO date the server's passes end, or null. */
  serverUntil: string | null;
  activate: (months: number) => void;
  cancel: () => void;
  setServerUntil: (until: string | null) => void;
};

export const usePremium = create<PremiumState>()(
  persist(
    (set) => ({
      activeUntil: null,
      serverUntil: null,
      activate: (months) =>
        set((s) => {
          // A new pass extends an active one (prepaid, no auto-renew).
          const from = s.activeUntil && new Date(s.activeUntil) > new Date() ? new Date(s.activeUntil) : new Date();
          from.setMonth(from.getMonth() + months);
          return { activeUntil: from.toISOString() };
        }),
      cancel: () => set({ activeUntil: null }),
      setServerUntil: (serverUntil) => set({ serverUntil }),
    }),
    { name: 'premium', storage: syncStorage, version: 1 },
  ),
);

const latest = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

/** End of the current pass (server or mock), or null when not Premium. */
export const usePremiumUntil = () =>
  usePremium((s) => {
    const until = latest(s.activeUntil, s.serverUntil);
    return until && new Date(until).getTime() > Date.now() ? until : null;
  });

export const useIsPremium = () => usePremiumUntil() !== null;
