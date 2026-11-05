import { wipeUserData } from '@/db/sync';
import { deleteAccount } from '@/services/auth';
import { useLog } from '@/store/log';
import { useOnboarding } from '@/store/onboarding';
import { resetPlan } from '@/store/plan';
import { usePremium } from '@/store/premium';
import { useScanQuota } from '@/store/scanQuota';
import { useSettings } from '@/store/settings';
import { useWeights } from '@/store/weights';

/**
 * Delete the account on the server, then everything it left on this phone
 * (meals, photos, weights, profile, plan, passes, feast days). Language and app
 * settings stay. The next sync starts a fresh anonymous account.
 */
export async function deleteAccountAndData() {
  await deleteAccount();
  wipeUserData();
  useLog.setState({ entries: [] });
  useWeights.setState({ entries: [] });
  useOnboarding.getState().reset();
  resetPlan();
  usePremium.setState({ activeUntil: null, serverUntil: null });
  useScanQuota.getState().reset();
  useSettings.setState({ feastDays: [] });
}
