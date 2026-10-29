import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from './database.types';

/**
 * Supabase client (docs/BACKEND.md). The session is kept in SQLite-backed
 * localStorage. Builds without EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY
 * run fully offline with the prototype mocks (scan, sign-in), as before.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const backendEnabled = Boolean(url && key);

if (!backendEnabled && !__DEV__) {
  console.error('[supabase] EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY missing: nothing will sync');
}

export const supabase: SupabaseClient<Database> | null = backendEnabled
  ? createClient<Database>(url!, key!, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Refresh the session only while the app is in the foreground.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
