/**
 * Why a photo isn't a meal yet, so Home and Result can say so:
 * quota — today's free scans are used up (it is sent tomorrow, or now with Premium)
 * offline — no connection, or not on Wi-Fi in "Wi-Fi only" mode
 * failed — the last attempt failed; it is retried later, or now with Retry
 * empty — the scan found no food
 * analyzing — being sent or analysed right now
 * null — it's a meal
 */
export type WaitReason = 'quota' | 'offline' | 'failed' | 'empty' | 'analyzing';

export function waitReason(p: {
  status: 'queued' | 'analyzing' | 'done';
  itemCount: number;
  /** No free scans left today and no Premium. */
  blocked: boolean;
  canUpload: boolean;
  /** The last scan attempt failed. */
  failed: boolean;
}): WaitReason | null {
  if (p.status === 'done') return p.itemCount ? null : 'empty';
  if (p.status === 'analyzing') return 'analyzing';
  if (p.blocked) return 'quota';
  if (!p.canUpload) return 'offline';
  return p.failed ? 'failed' : 'analyzing';
}
