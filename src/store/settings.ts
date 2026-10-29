import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_LANGUAGE, type Language } from '@/i18n/languages';
import { syncStorage } from '@/lib/storage';

type SettingsState = {
  language: Language;
  uposathaVegetarian: boolean;
  feastDay: boolean;
  reminders: boolean;
  wifiOnlyUploads: boolean;
  /** Dev builds only: pretend the phone is offline to test the queue. */
  devSimulateOffline: boolean;
  setLanguage: (language: Language) => void;
  toggle: (key: ToggleKey) => void;
  setReminders: (on: boolean) => void;
};

export type ToggleKey = 'uposathaVegetarian' | 'feastDay' | 'reminders' | 'wifiOnlyUploads' | 'devSimulateOffline';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      uposathaVegetarian: true,
      feastDay: false,
      reminders: true,
      wifiOnlyUploads: false,
      devSimulateOffline: false,
      setLanguage: (language) => set({ language }),
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
      setReminders: (reminders: boolean) => set({ reminders }),
    }),
    { name: 'settings', storage: syncStorage, version: 1 },
  ),
);

export const useLanguage = () => useSettings((s) => s.language);
