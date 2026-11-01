import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { dayKey } from '@/lib/dates';
import { syncStorage } from '@/lib/storage';

import { useIsPremium } from './premium';

/**
 * Free photo scans a day: more in the first week, then fewer. The server
 * enforces it (free_scans_per_day, scan_quota); this is the phone's mirror. Its
 * week counts from first use on this phone, the server's from account creation,
 * so after a restore the counter corrects itself on the first scan.
 */
export const FREE_SCANS_FIRST_WEEK = 3;
export const FREE_SCANS_PER_DAY = 1;
const FIRST_WEEK_DAYS = 7;

/** Free scans on `day` for someone who started on `firstDay` (both YYYY-MM-DD). */
export function freeScansFor(firstDay: string, day: string) {
  const days = Math.round((Date.parse(day) - Date.parse(firstDay)) / 86_400_000);
  return days < FIRST_WEEK_DAYS ? FREE_SCANS_FIRST_WEEK : FREE_SCANS_PER_DAY;
}

type ScanQuotaState = {
  /** First day the app was used on this phone (YYYY-MM-DD). */
  firstDay: string;
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
const allowance = (s: { firstDay: string }) => freeScansFor(s.firstDay, today());

/** Saved on the phone so closing the app doesn't reset the count; a new day does. */
export const useScanQuota = create<ScanQuotaState>()(
  persist(
    (set) => ({
      firstDay: today(),
      day: today(),
      used: 0,
      blockedDay: null,
      consume: () =>
        set((s) => ({
          day: today(),
          used: Math.min((s.day === today() ? s.used : 0) + 1, allowance(s)),
        })),
      reset: () => set({ day: today(), used: 0, blockedDay: null }),
      syncUsed: (used) =>
        set((s) => ({
          day: today(),
          used: Math.min(Math.max(s.day === today() ? s.used : 0, used), allowance(s)),
        })),
      syncLeft: (left) => {
        if (left !== null) useScanQuota.getState().syncUsed(allowance(useScanQuota.getState()) - left);
      },
      blockToday: () => set((s) => ({ day: today(), used: allowance(s), blockedDay: today() })),
    }),
    {
      name: 'scan-quota',
      storage: syncStorage,
      version: 2,
      // Version 1 had no first day: count the week from the update.
      migrate: (state, version) =>
        (version < 2 ? { ...(state as object), firstDay: today() } : state) as ScanQuotaState,
    },
  ),
);

/** Free scans allowed today (3 in the first week, then 1). */
export const useFreeScansToday = () => useScanQuota(allowance);

/** Free scans left today; Infinity for Premium (unlimited photo scans). */
export function useScansLeft() {
  const premium = useIsPremium();
  const left = useScanQuota((s) => Math.max(allowance(s) - (s.day === today() ? s.used : 0), 0));
  return premium ? Infinity : left;
}
