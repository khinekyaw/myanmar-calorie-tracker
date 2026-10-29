import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { dayKey } from '@/lib/dates';
import { syncStorage } from '@/lib/storage';

import { useIsPremium } from './premium';

/** Free tier: 3 photo scans a day. The server enforces it (scan_quota); this is the phone's mirror. */
export const FREE_SCANS_PER_DAY = 3;

type ScanQuotaState = {
  /** Day the count belongs to (YYYY-MM-DD). */
  day: string;
  used: number;
  /** Day the server refused a scan for lack of free scans; queued photos wait for the next day. */
  blockedDay: string | null;
  consume: () => void;
  reset: () => void;
  /** Take the server's count when it is higher (another phone, or photos sent later). */
  syncUsed: (used: number) => void;
  /** After a scan: the server's scans left today (null for Premium). */
  syncLeft: (left: number | null) => void;
  blockToday: () => void;
};

const today = () => dayKey(new Date());

/** Saved on the phone so closing the app doesn't reset the count; a new day does. */
export const useScanQuota = create<ScanQuotaState>()(
  persist(
    (set) => ({
      day: today(),
      used: 0,
      blockedDay: null,
      consume: () =>
        set((s) => ({
          day: today(),
          used: Math.min((s.day === today() ? s.used : 0) + 1, FREE_SCANS_PER_DAY),
        })),
      reset: () => set({ day: today(), used: 0, blockedDay: null }),
      syncUsed: (used) =>
        set((s) => ({
          day: today(),
          used: Math.min(Math.max(s.day === today() ? s.used : 0, used), FREE_SCANS_PER_DAY),
        })),
      syncLeft: (left) => {
        if (left !== null) useScanQuota.getState().syncUsed(FREE_SCANS_PER_DAY - left);
      },
      blockToday: () => set({ day: today(), used: FREE_SCANS_PER_DAY, blockedDay: today() }),
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
