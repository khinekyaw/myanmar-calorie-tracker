import { enqueue, getMeta, nowIso, setMeta } from '@/db/database';
import { useOnboarding } from '@/store/onboarding';
import { refreshPlan, usePlan } from '@/store/plan';
import { useSettings } from '@/store/settings';

import { isNewer, isProfileComplete, profileFromServer, profileToServer, type ProfileSource, type ServerProfile } from './mapping';

/**
 * The profile lives in the key-value stores (onboarding answers, language,
 * Uposatha, plan), not in SQLite, so changes are noticed by watching the
 * stores. Its `updated_at` is kept in meta.
 */

const UPDATED_AT = 'profile_updated_at';
let applying = false;

function source(): ProfileSource {
  const { completed, update: _u, complete: _c, reset: _r, ...draft } = useOnboarding.getState();
  const settings = useSettings.getState();
  return {
    draft,
    completed,
    language: settings.language,
    uposathaVegetarian: settings.uposathaVegetarian,
    plan: usePlan.getState().plan,
  };
}

const fingerprint = () => JSON.stringify(source());

/** Queue the profile for sync whenever a synced field changes. Returns a stop function. */
export function watchProfile(): () => void {
  let last = fingerprint();
  const onChange = () => {
    const next = fingerprint();
    if (next === last) return;
    last = next;
    if (applying) return;
    setMeta(UPDATED_AT, nowIso());
    enqueue('profile', 'me', 'upsert');
  };
  const stops = [useOnboarding.subscribe(onChange), useSettings.subscribe(onChange), usePlan.subscribe(onChange)];
  return () => stops.forEach((stop) => stop());
}

/** The profile to send, or null while onboarding is unfinished. */
export function profileForPush(): ServerProfile | null {
  let updatedAt = getMeta(UPDATED_AT);
  if (!updatedAt) {
    updatedAt = nowIso();
    setMeta(UPDATED_AT, updatedAt);
  }
  return profileToServer(source(), updatedAt);
}

/**
 * Take the server's profile when it is newer, or when this phone has no
 * finished profile (a new phone signing in to an existing account).
 */
export function applyServerProfile(server: ServerProfile) {
  const localComplete = isProfileComplete(useOnboarding.getState());
  if (localComplete && !isNewer(server.updated_at, getMeta(UPDATED_AT))) return;
  const { draft, completed, language, uposathaVegetarian } = profileFromServer(server);
  applying = true;
  try {
    useOnboarding.setState({ ...draft, completed: useOnboarding.getState().completed || completed });
    useSettings.setState({ language, uposathaVegetarian });
    refreshPlan();
    setMeta(UPDATED_AT, server.updated_at);
  } finally {
    applying = false;
  }
}
