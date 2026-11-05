import { useEffect, useState } from 'react';
import { create } from 'zustand';

import { waitReason, type WaitReason } from '@/domain/waitReason';
import { dayKey } from '@/lib/dates';
import { useConnectivity } from '@/lib/network';
import { ensureSession } from '@/services/auth';
import { newId } from '@/db/database';
import { keepPhoto } from '@/db/photos';
import { compressPhoto, ScanError, scanPhoto, toMealItems, uploadPhoto } from '@/services/scan';
import { backendEnabled } from '@/services/supabase';
import { useLog, type LogEntry } from '@/store/log';
import { isPremiumNow, useIsPremium } from '@/store/premium';
import { useScanQuota } from '@/store/scanQuota';

/** Failed attempts per entry and when to try again (in memory: a restart retries at once). */
const failures = new Map<string, number>();
const retryAt = new Map<string, number>();

/** 30 s, 1 min, 2 min … up to 15 minutes. */
const backoff = (n: number) => Math.min(30_000 * 2 ** (n - 1), 15 * 60_000);

/**
 * Failed scans are sent again by themselves this many times, then wait for
 * Retry: a photo the AI can't read would otherwise cost an AI call every 15
 * minutes (a failure gives the free scan back). The server stops at 6.
 */
export const MAX_AUTO_TRIES = 3;

/** Photos whose last scan attempt failed, for Home and Result (in memory, like the retry times). */
const useFailedScans = create<{ ids: Record<string, true> }>(() => ({ ids: {} }));

function markFailed(id: string, failed: boolean) {
  useFailedScans.setState((s) => {
    if (Boolean(s.ids[id]) === failed) return s;
    const ids = { ...s.ids };
    if (failed) ids[id] = true;
    else delete ids[id];
    return { ids };
  });
}

/**
 * A camera or gallery photo becomes a queued meal: one free scan is counted
 * on this phone, the compressed photo is kept in permanent storage (not the
 * cache) so it survives restarts, and the queue sends it. Returns the meal id.
 */
export async function queuePhoto(photo: { uri: string; width: number; height: number }): Promise<string> {
  useScanQuota.getState().consume();
  const compressed = await compressPhoto(photo.uri, photo.width, photo.height).catch(() => photo.uri);
  const id = newId();
  const photoUri = keepPhoto(compressed, id);
  useLog.getState().addEntry({ id, source: 'photo', status: 'queued', photoUri, items: [] });
  return id;
}

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
    markFailed(entry.id, false);
  } catch (e) {
    const kind = e instanceof ScanError ? e.kind : 'retry';
    // Keep it queued; it is sent again later.
    updateEntry(entry.id, { status: 'queued', ...(kind === 'photo' && { remotePhoto: undefined }) });
    if (kind === 'quota') {
      useScanQuota.getState().blockToday();
      // Free users wait for tomorrow (blockedDay). Someone the server doesn't
      // see as Premium (a phone-only pass) must not resend at once in a loop.
      const n = (failures.get(entry.id) ?? 0) + 1;
      failures.set(entry.id, n);
      retryAt.set(entry.id, Date.now() + backoff(n));
    } else {
      const n = (failures.get(entry.id) ?? 0) + 1;
      failures.set(entry.id, n);
      // A missing photo is uploaded again straight away, once.
      const wait = kind === 'photo' && n === 1 ? 0 : n >= MAX_AUTO_TRIES ? Infinity : backoff(n);
      retryAt.set(entry.id, Date.now() + wait);
      if (kind === 'retry' || (kind === 'photo' && n > 1)) markFailed(entry.id, true);
    }
    if (kind !== 'busy') console.warn('[scan]', kind, e instanceof Error ? e.message : e);
  }
}

/** Try a failed photo again now instead of waiting for its retry time. */
export function retryScan(entry: LogEntry) {
  failures.delete(entry.id);
  retryAt.delete(entry.id);
  markFailed(entry.id, false);
  void analyzeEntry(entry);
}

export type { WaitReason };

/** Why this photo isn't a meal yet (see domain/waitReason.ts). */
export function useWaitReason(entry: LogEntry | undefined): WaitReason | null {
  const { canUpload } = useConnectivity();
  const premium = useIsPremium();
  const blocked = useScanQuota((s) => s.blockedDay === dayKey(new Date())) && !premium;
  const failed = useFailedScans((s) => (entry ? Boolean(s.ids[entry.id]) : false));
  if (!entry) return null;
  return waitReason({ status: entry.status, itemCount: entry.items.length, blocked, canUpload, failed });
}

/** Milliseconds until the next local midnight. */
const untilMidnight = (now: Date) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

/**
 * Send every queued photo that is due. Returns when to look again (ms
 * timestamp; Infinity when nothing waits). Photos wait offline (the caller
 * checks), after a failure until their retry time, and for the rest of the
 * day once the server says the free scans are used up.
 */
export function sendDuePhotos(now = Date.now()): number {
  const premium = isPremiumNow();
  const blocked = useScanQuota.getState().blockedDay === dayKey(new Date(now)) && !premium;
  const queued = useLog.getState().entries.filter((e) => e.status === 'queued' && e.photoUri);
  if (!queued.length) return Infinity;
  // A new day gives new free scans: look again at midnight.
  if (blocked) return now + untilMidnight(new Date(now));
  let nextTry = Infinity;
  for (const entry of queued) {
    const at = retryAt.get(entry.id) ?? 0;
    if (at <= now) void analyzeEntry(entry);
    else nextTry = Math.min(nextTry, at);
  }
  return nextTry;
}

/**
 * Mounted once (root layout). Whenever uploads are allowed, sends the
 * queued photos that are due (sendDuePhotos) and wakes up for the next one.
 */
export function useScanQueue() {
  const { canUpload } = useConnectivity();
  const queued = useLog((s) => s.entries.filter((e) => e.status === 'queued').map((e) => e.id).join(','));
  const premium = useIsPremium();
  const blocked = useScanQuota((s) => s.blockedDay === dayKey(new Date())) && !premium;
  const [wake, setWake] = useState(0);

  useEffect(() => {
    if (!canUpload || !queued) return;
    const now = Date.now();
    const nextTry = sendDuePhotos(now);
    if (nextTry === Infinity) return;
    const timer = setTimeout(() => setWake((n) => n + 1), Math.max(nextTry - now, 1000));
    return () => clearTimeout(timer);
  }, [canUpload, queued, blocked, premium, wake]);
}
