import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_LANGUAGE, type Language } from '@/i18n/languages';
import { dayKey } from '@/lib/dates';
import { syncStorage } from '@/lib/storage';

type SettingsState = {
  language: Language;
  uposathaVegetarian: boolean;
  /** Days marked as feast days (YYYY-MM-DD): each keeps the streak alive on that day only. */
  feastDays: string[];
  reminders: boolean;
  wifiOnlyUploads: boolean;
  /** Dev builds only: pretend the phone is offline to test the queue. */
  devSimulateOffline: boolean;
  setLanguage: (language: Language) => void;
  toggle: (key: ToggleKey) => void;
  /** Mark or unmark today as a feast day. */
  toggleFeastToday: () => void;
  setReminders: (on: boolean) => void;
};

export type ToggleKey = 'uposathaVegetarian' | 'reminders' | 'wifiOnlyUploads' | 'devSimulateOffline';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      uposathaVegetarian: true,
      feastDays: [],
      reminders: true,
      wifiOnlyUploads: false,
      devSimulateOffline: false,
      setLanguage: (language) => set({ language }),
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
      toggleFeastToday: () =>
        set((s) => {
          const today = dayKey(new Date());
          return {
            feastDays: s.feastDays.includes(today) ? s.feastDays.filter((d) => d !== today) : [...s.feastDays, today],
          };
        }),
      setReminders: (reminders: boolean) => set({ reminders }),
    }),
    {
      name: 'settings',
      storage: syncStorage,
      version: 2,
      // Version 1 had one on/off switch for "feast day" with no date: count it for today only.
      migrate: (persisted, version) => {
        const { feastDay, ...rest } = (persisted ?? {}) as Partial<SettingsState> & { feastDay?: boolean };
        if (version >= 2) return persisted as SettingsState;
        return { ...rest, feastDays: feastDay ? [dayKey(new Date())] : [] } as SettingsState;
      },
    },
  ),
);

export const useLanguage = () => useSettings((s) => s.language);

/** Is today marked as a feast day? */
export const useFeastToday = () => useSettings((s) => s.feastDays.includes(dayKey(new Date())));
