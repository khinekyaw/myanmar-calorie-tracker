import { router } from 'expo-router';

import { useAccount } from '@/services/auth';
import { backendEnabled } from '@/services/supabase';

/**
 * Screens that need a signed-in account (not an anonymous one). Opening one
 * while signed out goes straight to Sign in, which then continues to it
 * (the `then` param), instead of showing a "sign in first" screen.
 */
export const AFTER_SIGN_IN = { redeem: '/redeem' } as const;
export type AfterSignIn = keyof typeof AFTER_SIGN_IN;

export const isAfterSignIn = (value: string | undefined): value is AfterSignIn =>
  value !== undefined && Object.hasOwn(AFTER_SIGN_IN, value);

/** Without a backend (prototype builds) there are no accounts, so nothing waits. */
export const isSignedIn = () => !backendEnabled || Boolean(useAccount.getState().email);

/** Open `target`, through Sign in first when needed. `replace` swaps the current screen. */
export function openSignedIn(target: AfterSignIn, { replace = false, force = false } = {}) {
  const go = replace ? router.replace : router.push;
  if (isSignedIn() && !force) return go(AFTER_SIGN_IN[target]);
  go({ pathname: '/sign-in', params: { from: 'settings', then: target } });
}
