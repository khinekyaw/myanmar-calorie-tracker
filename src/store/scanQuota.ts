import { create } from 'zustand';

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

export const useScansLeft = () => useScanQuota((s) => FREE_SCANS_PER_DAY - s.used);
