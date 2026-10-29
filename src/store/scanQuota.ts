import { create } from 'zustand';

import { useIsPremium } from './premium';

/** Free tier: 3 photo scans a day. Mock — the server enforces the real quota. */
export const FREE_SCANS_PER_DAY = 3;

type ScanQuotaState = {
  used: number;
  consume: () => void;
  reset: () => void;
};

export const useScanQuota = create<ScanQuotaState>()((set) => ({
  used: 1,
  consume: () => set((s) => ({ used: Math.min(s.used + 1, FREE_SCANS_PER_DAY) })),
  reset: () => set({ used: 0 }),
}));

/** Free scans left today; Infinity for Premium (unlimited photo scans). */
export function useScansLeft() {
  const premium = useIsPremium();
  const left = useScanQuota((s) => FREE_SCANS_PER_DAY - s.used);
  return premium ? Infinity : left;
}
