import { getMeta, setMeta } from '@/db/database';
import { loadCatalogue, saveRemoteDishes } from '@/db/dishes';
import { logsForPush, markSent, pendingChanges, saveRemoteLogs, saveRemoteWeights, startOverForUser, weightsForPush } from '@/db/sync';
import { loadWeights } from '@/db/weights';
import { ensureSession } from '@/services/auth';
import type { Json } from '@/services/database.types';
import { backendEnabled, supabase } from '@/services/supabase';
import { useLog } from '@/store/log';
import { refreshPlan } from '@/store/plan';
import { usePremium } from '@/store/premium';
import { useScanQuota } from '@/store/scanQuota';
import { useWeights } from '@/store/weights';

import { dishFromServer, logToServer, passesUntil, weightToServer, type ServerDish, type ServerLog, type ServerProfile, type ServerWeight } from './mapping';
import { applyServerProfile, profileForPush } from './profile';

/**
 * Sync engine (docs/OFFLINE.md → "How sync works"):
 *   push — send the outbox in batches (sync_push), then forget what was sent;
 *   pull — fetch rows written since the last cursor, page by page (sync_pull).
 * Newest `updated_at` wins on both sides. One sync at a time; failures retry
 * with backoff. Data is tiny, so it syncs on any connection (only photos
 * respect "Wi-Fi only").
 */

const PUSH_BATCH = 100;
const CURSOR = 'sync_cursor';

type Page<T> = { rows: T[]; next: Record<string, unknown> | null };
type PullResponse = {
  cursor: string;
  profile?: ServerProfile | null;
  passes?: { starts_at: string; ends_at: string }[];
  scans_used_today?: number;
  food_logs?: Page<ServerLog>;
  weights?: Page<ServerWeight>;
  dishes?: Page<ServerDish>;
};
type PushResponse = {
  rejected: { entity: string; id: string; error: string }[];
  profile: ServerProfile | null;
  food_logs: ServerLog[];
  weights: ServerWeight[];
};

type Changed = { logs: number; weights: number; dishes: number };

/** The server no longer knows this account (deleted elsewhere): sign out and start over. */
class AccountGone extends Error {}

/** sync_push / sync_pull refuse with SQLSTATE 28000 when the account is missing. */
const check = (error: { code?: string } | null) => {
  if (!error) return;
  throw error.code === '28000' ? new AccountGone('account no longer exists') : error;
};

function client() {
  if (!supabase) throw new Error('backend not configured');
  return supabase;
}

async function push(changed: Changed) {
  for (let round = 0; round < 50; round++) {
    const batch = pendingChanges(PUSH_BATCH);
    if (!batch.length) return;
    const ids = (entity: string) => batch.filter((c) => c.entity === entity).map((c) => c.entity_id);

    const foodLogs = logsForPush(ids('food_log'))
      .map(({ row, items }) => logToServer(row, items))
      .filter((l) => l !== null);
    const weights = weightsForPush(ids('weight')).map(weightToServer);
    const profile = ids('profile').length ? profileForPush() : null;

    if (foodLogs.length || weights.length || profile) {
      const { data, error } = await client().rpc('sync_push', {
        changes: { food_logs: foodLogs, weights, ...(profile && { profile }) } as unknown as Json,
      });
      check(error);
      const res = data as unknown as PushResponse;
      // Where the server was newer, take its copy now.
      changed.logs += saveRemoteLogs(res.food_logs);
      changed.weights += saveRemoteWeights(res.weights);
      if (res.profile) applyServerProfile(res.profile);
      // Refused rows (bad data) are dropped, so they can't block everything else.
      if (res.rejected.length) console.warn('[sync] server refused', res.rejected);
    }
    markSent(batch);
  }
}

async function pull(changed: Changed) {
  const since = getMeta(CURSOR) ?? undefined;
  let after: Record<string, unknown> | undefined;
  let cursor: string | null = null;
  for (let page = 0; page < 200; page++) {
    const { data, error } = await client().rpc('sync_pull', { since, after: after as never });
    check(error);
    const res = data as unknown as PullResponse;

    if (!after) {
      cursor = res.cursor;
      if (res.profile) applyServerProfile(res.profile);
      usePremium.getState().setServerUntil(passesUntil(res.passes ?? []));
      useScanQuota.getState().syncUsed(res.scans_used_today ?? 0);
    }
    // Dishes first: meals refer to them.
    if (res.dishes?.rows.length) {
      saveRemoteDishes(res.dishes.rows.map((d) => ({ dish: dishFromServer(d), updatedAt: d.updated_at })));
      changed.dishes += res.dishes.rows.length;
    }
    if (res.food_logs) changed.logs += saveRemoteLogs(res.food_logs.rows);
    if (res.weights) changed.weights += saveRemoteWeights(res.weights.rows);

    const next = Object.fromEntries(
      (['food_logs', 'weights', 'dishes'] as const).filter((k) => res[k]?.next).map((k) => [k, res[k]!.next]),
    );
    if (!Object.keys(next).length) break;
    after = next;
  }
  // Only after the last page: an interrupted pull starts again from the old cursor.
  if (cursor) setMeta(CURSOR, cursor);
}

/** Show what sync wrote in the in-memory stores. */
function refreshStores(changed: Changed) {
  if (changed.dishes) loadCatalogue();
  if (changed.logs || changed.dishes) useLog.getState().reload();
  if (changed.weights) {
    useWeights.setState({ entries: loadWeights() });
    refreshPlan();
  }
}

async function runSync(retried = false): Promise<void> {
  const userId = await ensureSession();
  if (getMeta('sync_user') !== userId) {
    startOverForUser(userId);
    useLog.getState().reload();
  }
  const changed: Changed = { logs: 0, weights: 0, dishes: 0 };
  try {
    await push(changed);
    await pull(changed);
  } catch (e) {
    if (!(e instanceof AccountGone) || retried) throw e;
    // Everything is still on the phone: a new account gets all of it.
    await client().auth.signOut({ scope: 'local' });
    return runSync(true);
  } finally {
    refreshStores(changed);
  }
}

// ── Scheduling ───────────────────────────────────────────────────────────

let online = false;
let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;

/** Last sync result, for Settings → Developer. */
let lastSync: { at: string; ok: boolean; error?: string } | null = null;
export const getLastSync = () => lastSync;

export function setOnline(value: boolean) {
  const cameOnline = value && !online;
  online = value;
  if (cameOnline) scheduleSync();
}

/** Sync soon (changes are batched for `delayMs`). Safe to call often. */
export function scheduleSync(delayMs = 0) {
  if (!backendEnabled) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, delayMs);
}

export function syncNow(): Promise<void> {
  if (!backendEnabled || !online) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      await runSync();
      failures = 0;
      lastSync = { at: new Date().toISOString(), ok: true };
    } catch (e) {
      failures += 1;
      lastSync = { at: new Date().toISOString(), ok: false, error: e instanceof Error ? e.message : String(e) };
      console.warn('[sync] failed, retrying later', lastSync.error);
      // 5 s, 10 s, 20 s … up to 5 minutes.
      scheduleSync(Math.min(5_000 * 2 ** (failures - 1), 5 * 60_000));
    } finally {
      running = null;
      if (again) {
        again = false;
        scheduleSync();
      }
    }
  })();
  return running;
}
