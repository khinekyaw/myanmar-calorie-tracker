import 'expo-sqlite/localStorage/install';
import '@/lib/webCrypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Device from 'expo-device';
import { AppState, Platform } from 'react-native';

import { resolveBackendUrl } from './backendUrl';
import type { Database } from './database.types';

/**
 * Supabase client (docs/BACKEND.md). The session is kept in SQLite-backed
 * localStorage. Builds without EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY
 * run fully offline with the prototype mocks (scan, sign-in), as before.
 */
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const url = envUrl && resolveBackendUrl(envUrl, Platform.OS, !Device.isDevice);
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
        // Google sign-in returns a one-time code to the app, exchanged here for a session.
        flowType: 'pkce',
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
