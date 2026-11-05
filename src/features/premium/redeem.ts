import { normalizeGiftCode } from '@/domain/giftCode';
import { supabase } from '@/services/supabase';
import { usePremium } from '@/store/premium';
import { scheduleSync } from '@/sync/engine';

/** What the server said about a gift code (public.redeem_gift_code). */
export type RedeemResult =
  | 'ok'
  | 'invalid'
  | 'expired'
  | 'used_up'
  | 'already_used'
  | 'rate_limited'
  | 'sign_in_required';

/**
 * Redeem a gift code. On success the pass shows at once (the server's end
 * date), and a sync brings the pass row itself. Throws on network trouble.
 * Without a backend (prototype) any code gives a one-month local pass (MOCK).
 */
export async function redeemGiftCode(code: string): Promise<{ result: RedeemResult; endsAt: string | null }> {
  if (!supabase) {
    usePremium.getState().activate(1);
    return { result: 'ok', endsAt: usePremium.getState().activeUntil };
  }
  const { data, error } = await supabase.rpc('redeem_gift_code', { p_code: normalizeGiftCode(code) });
  if (error) throw error;
  const answer = data as { result: RedeemResult; ends_at?: string };
  const endsAt = answer.ends_at ?? null;
  if (answer.result === 'ok' && endsAt) {
    const current = usePremium.getState().serverUntil;
    // A new pass chains after any active one, so its end is the latest.
    if (!current || Date.parse(endsAt) > Date.parse(current)) usePremium.getState().setServerUntil(endsAt);
    scheduleSync();
  }
  return { result: answer.result, endsAt };
}
