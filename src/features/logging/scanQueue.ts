import { useEffect } from 'react';

import { useConnectivity } from '@/lib/network';
import { scanPhoto, toMealItems } from '@/services/scan';
import { useLog, type LogEntry } from '@/store/log';

/** Send one photo entry to the scan service and store the answer on the entry. */
export async function analyzeEntry(entry: LogEntry) {
  if (!entry.photoUri) return;
  const { updateEntry } = useLog.getState();
  updateEntry(entry.id, { status: 'analyzing' });
  try {
    const res = await scanPhoto(entry.photoUri);
    const top = res.items[0];
    updateEntry(entry.id, {
      status: 'done',
      items: toMealItems(res),
      isSharedMeal: res.shared_table,
      confidence: top?.confidence ?? 0,
      candidates: res.candidates?.map((c) => ({ dishId: c.dish_id, confidence: c.confidence })),
    });
  } catch {
    // Keep it queued; the queue retries when the connection changes.
    updateEntry(entry.id, { status: 'queued' });
  }
}

/**
 * Mounted once (root layout). Whenever uploads are allowed, sends every
 * queued photo. Photos stay queued offline or off Wi-Fi in "Wi-Fi only" mode.
 */
export function useScanQueue() {
  const { canUpload } = useConnectivity();
  const queued = useLog((s) => s.entries.filter((e) => e.status === 'queued').map((e) => e.id).join(','));

  useEffect(() => {
    if (!canUpload || !queued) return;
    for (const entry of useLog.getState().entries) {
      if (entry.status === 'queued') void analyzeEntry(entry);
    }
  }, [canUpload, queued]);
}
