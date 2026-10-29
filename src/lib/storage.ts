import { Storage } from 'expo-sqlite/kv-store';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Synchronous key-value storage backed by SQLite.
 * Sync reads let persisted stores (language, onboarding) hydrate before the
 * first render.
 */
export const syncStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));
