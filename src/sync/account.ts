import { pendingSyncCount } from '@/db/database';
import { wipeUserData } from '@/db/sync';
import { deleteAccount, signOut } from '@/services/auth';
import { useLog } from '@/store/log';
import { useOnboarding } from '@/store/onboarding';
import { resetPlan } from '@/store/plan';
import { usePremium } from '@/store/premium';
import { useScanQuota } from '@/store/scanQuota';
import { useSettings } from '@/store/settings';
import { useWeights } from '@/store/weights';

import { syncNow } from './engine';

/**
 * Delete the account on the server, then everything it left on this phone
 * (meals, photos, weights, profile, plan, passes, feast days). Language and app
 * settings stay. The next sync starts a fresh anonymous account.
 */
export async function deleteAccountAndData() {
  await deleteAccount();
  clearPhone();
}

export type SignOutResult = 'ok' | 'unsaved';

/**
 * Sign out (Settings). Everything not yet on the server is sent first; if any
 * of it can't be (offline, server error), nothing happens and the result is
 * 'unsaved'. Then the phone is cleared like after deleting the account, and
 * the next sync starts a fresh anonymous account. Signing in again brings the
 * data back from the server. Photos still waiting to be scanned exist only
 * here and are lost (the confirm sheet says so).
 */
export async function signOutAndClear(): Promise<SignOutResult> {
  await syncNow();
  if (pendingSyncCount() > 0) return 'unsaved';
  await signOut();
  clearPhone();
  return 'ok';
}

/** The account's data on this phone; language and app settings stay. */
function clearPhone() {
  wipeUserData();
  useLog.setState({ entries: [] });
  useWeights.setState({ entries: [] });
  useOnboarding.getState().reset();
  resetPlan();
  usePremium.setState({ activeUntil: null, serverUntil: null });
  useScanQuota.getState().reset();
  useSettings.setState({ feastDays: [] });
}
