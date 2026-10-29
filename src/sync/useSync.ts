import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onOutboxChange } from '@/db/database';
import { useConnectivity } from '@/lib/network';
import { backendEnabled } from '@/services/supabase';

import { scheduleSync, setOnline } from './engine';
import { watchProfile } from './profile';

/** Wait this long after a change, so a burst of edits goes up in one push. */
const DEBOUNCE_MS = 2_000;

/**
 * Mounted once (root layout). Syncs when the app starts or comes to the
 * foreground, when the connection returns, and shortly after any change.
 */
export function useSync() {
  const { online } = useConnectivity();

  useEffect(() => {
    if (!backendEnabled) return;
    const stopProfile = watchProfile();
    const stopOutbox = onOutboxChange(() => scheduleSync(DEBOUNCE_MS));
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleSync();
    });
    return () => {
      stopProfile();
      stopOutbox();
      appState.remove();
    };
  }, []);

  useEffect(() => {
    setOnline(online);
  }, [online]);
}
