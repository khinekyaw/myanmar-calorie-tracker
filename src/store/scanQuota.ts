import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { dayKey } from '@/lib/dates';
import { syncStorage } from '@/lib/storage';

import { useIsPremium } from './premium';

/** Free tier: 3 photo scans a day. The server will enforce the real quota (scan_quota). */
export const FREE_SCANS_PER_DAY = 3;

type ScanQuotaState = {
  /** Day the count belongs to (YYYY-MM-DD). */
  day: string;
  used: number;
  consume: () => void;
  reset: () => void;
};

const today = () => dayKey(new Date());

/** Saved on the phone so closing the app doesn't reset the count; a new day does. */
export const useScanQuota = create<ScanQuotaState>()(
  persist(
    (set) => ({
      day: today(),
      used: 0,
      consume: () =>
        set((s) => ({
          day: today(),
          used: Math.min((s.day === today() ? s.used : 0) + 1, FREE_SCANS_PER_DAY),
        })),
      reset: () => set({ day: today(), used: 0 }),
    }),
    { name: 'scan-quota', storage: syncStorage, version: 1 },
  ),
);

/** Free scans left today; Infinity for Premium (unlimited photo scans). */
export function useScansLeft() {
  const premium = useIsPremium();
  const left = useScanQuota((s) => FREE_SCANS_PER_DAY - (s.day === today() ? s.used : 0));
  return premium ? Infinity : left;
}
