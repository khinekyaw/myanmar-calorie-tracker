import { useEffect, useState } from 'react';

import { dayKey } from '@/lib/dates';
import { useConnectivity } from '@/lib/network';
import { ensureSession } from '@/services/auth';
import { ScanError, scanPhoto, toMealItems, uploadPhoto } from '@/services/scan';
import { backendEnabled } from '@/services/supabase';
import { useLog, type LogEntry } from '@/store/log';
import { useIsPremium } from '@/store/premium';
import { useScanQuota } from '@/store/scanQuota';

/** Failed attempts per entry and when to try again (in memory: a restart retries at once). */
const failures = new Map<string, number>();
const retryAt = new Map<string, number>();

/** 30 s, 1 min, 2 min … up to 15 minutes. */
const backoff = (n: number) => Math.min(30_000 * 2 ** (n - 1), 15 * 60_000);

/** Send one photo entry to the scan service and store the answer on the entry. */
export async function analyzeEntry(entry: LogEntry) {
  if (!entry.photoUri) return;
  const { updateEntry } = useLog.getState();
  updateEntry(entry.id, { status: 'analyzing' });
  try {
    // Upload once; a retry after a failed scan reuses the uploaded photo.
    let remotePhoto = entry.remotePhoto;
    if (backendEnabled && !(remotePhoto && remotePhoto.startsWith(`${await ensureSession()}/`))) {
      remotePhoto = await uploadPhoto(entry.id, entry.photoUri);
      updateEntry(entry.id, { remotePhoto });
    }
    const { response, scansLeft } = await scanPhoto(entry.id, entry.eatenAt);
    const top = response.items[0];
    updateEntry(entry.id, {
      status: 'done',
      items: toMealItems(response),
      isSharedMeal: response.shared_table,
      confidence: top?.confidence ?? 0,
      candidates: response.candidates?.map((c) => ({ dishId: c.dish_id, confidence: c.confidence })),
    });
    useScanQuota.getState().syncLeft(scansLeft);
    failures.delete(entry.id);
    retryAt.delete(entry.id);
  } catch (e) {
    const kind = e instanceof ScanError ? e.kind : 'retry';
    // Keep it queued; it is sent again later.
    updateEntry(entry.id, { status: 'queued', ...(kind === 'photo' && { remotePhoto: undefined }) });
    if (kind === 'quota') {
      useScanQuota.getState().blockToday();
    } else {
      const n = (failures.get(entry.id) ?? 0) + 1;
      failures.set(entry.id, n);
      // A missing photo is uploaded again straight away, once.
      retryAt.set(entry.id, Date.now() + (kind === 'photo' && n === 1 ? 0 : backoff(n)));
    }
    if (kind !== 'busy') console.warn('[scan]', kind, e instanceof Error ? e.message : e);
  }
}

/**
 * Mounted once (root layout). Whenever uploads are allowed, sends every
 * queued photo. Photos stay queued offline, off Wi-Fi in "Wi-Fi only" mode,
 * after a failure (until its retry time), and for the rest of the day once
 * the server says the free scans are used up.
 */
export function useScanQueue() {
  const { canUpload } = useConnectivity();
  const queued = useLog((s) => s.entries.filter((e) => e.status === 'queued').map((e) => e.id).join(','));
  const premium = useIsPremium();
  const blocked = useScanQuota((s) => s.blockedDay === dayKey(new Date())) && !premium;
  const [wake, setWake] = useState(0);

  useEffect(() => {
    if (!canUpload || !queued || blocked) return;
    const now = Date.now();
    let nextTry = Infinity;
    for (const entry of useLog.getState().entries) {
      if (entry.status !== 'queued') continue;
      const at = retryAt.get(entry.id) ?? 0;
      if (at <= now) void analyzeEntry(entry);
      else nextTry = Math.min(nextTry, at);
    }
    if (nextTry === Infinity) return;
    const timer = setTimeout(() => setWake((n) => n + 1), nextTry - now);
    return () => clearTimeout(timer);
  }, [canUpload, queued, blocked, wake]);
}
