import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

import { supabase } from './supabase';

/**
 * Accounts (docs/BACKEND.md → Auth). Everyone gets an anonymous account the
 * first time the phone is online, so their data syncs even if they skipped
 * sign-in. Signing in with an email code or Google links it to that account;
 * if the email or Google account already has an account, the phone switches
 * to it and its local data is merged in by the next sync. Phone (SMS) sign-in
 * is left out of the first version (docs/DECISIONS.md → "Email sign-in").
 */

type AccountState = {
  userId: string | null;
  /** The account's email, once signed in with an email code or Google; null while anonymous. */
  email: string | null;
  /** True when the account came from Google. */
  google: boolean;
};

export const useAccount = create<AccountState>()(() => ({ userId: null, email: null, google: false }));

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    const google = user?.identities?.find((i) => i.provider === 'google');
    const email = (google?.identity_data?.email as string | undefined) || user?.email || null;
    useAccount.setState({ userId: user?.id ?? null, email: user?.is_anonymous ? null : email, google: Boolean(google) });
  });
}

const client = () => {
  if (!supabase) throw new Error('backend not configured');
  return supabase;
};

/** The signed-in user's id, creating an anonymous account if there is none. */
export async function ensureSession(): Promise<string> {
  const auth = client().auth;
  const { data } = await auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: created, error } = await auth.signInAnonymously();
  if (error || !created.user) throw error ?? new Error('anonymous sign-in failed');
  return created.user.id;
}

/**
 * Sending and checking a code give up after this long, so a request that
 * never answers (weak signal, server restarting) shows an error instead of
 * a button that waits forever. The request itself may still finish.
 */
const CODE_TIMEOUT_MS = 20_000;

function withTimeout<T>(work: Promise<T>, ms = CODE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** How the code that was sent must be checked. */
export type CodeRequest = { email: string; mode: 'link' | 'signIn' };

/**
 * Email a 6-digit sign-in code (the templates in supabase/templates show the
 * code, not a link). An anonymous account adds the email to itself; if that
 * email already has an account, the phone signs in to that one instead.
 */
export function requestCode(email: string): Promise<CodeRequest> {
  return withTimeout(sendEmailCode(email));
}

async function sendEmailCode(email: string): Promise<CodeRequest> {
  const auth = client().auth;
  const { data } = await auth.getSession();
  if (data.session?.user.is_anonymous) {
    const { error } = await auth.updateUser({ email });
    if (!error) return { email, mode: 'link' };
    if (error.code !== 'email_exists') throw error;
  }
  const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
  return { email, mode: 'signIn' };
}

export async function verifyCode(request: CodeRequest, token: string) {
  const { error } = await withTimeout(client().auth.verifyOtp({
    email: request.email,
    token,
    type: request.mode === 'link' ? 'email_change' : 'email',
  }));
  if (error) throw error;
}

/** Where Google sends the browser back to; also in the redirect allow-list (supabase/config.toml, dashboard). */
export const AUTH_REDIRECT = 'sarai://auth/callback';

export type GoogleResult = 'signedIn' | 'cancelled';

/**
 * Sign in with Google in an in-app browser sheet (Supabase OAuth, PKCE).
 * An anonymous phone links Google to its own account (same id, nothing
 * moves). If that Google account already has a Sar AI account, the phone
 * switches to it and the next sync merges the local data, as with an email code.
 */
export async function signInWithGoogle(): Promise<GoogleResult> {
  const auth = client().auth;
  const { data } = await auth.getSession();
  if (data.session?.user.is_anonymous) {
    const linked = await runGoogleFlow('link');
    if (linked !== 'alreadyExists') return linked;
  }
  const result = await runGoogleFlow('signIn');
  if (result === 'alreadyExists') throw new Error('identity_already_exists');
  return result;
}

async function runGoogleFlow(mode: 'link' | 'signIn'): Promise<GoogleResult | 'alreadyExists'> {
  const auth = client().auth;
  const options = { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true };
  const { data, error } =
    mode === 'link'
      ? await auth.linkIdentity({ provider: 'google', options })
      : await auth.signInWithOAuth({ provider: 'google', options });
  if (error) throw error;
  if (!data.url) throw new Error('no sign-in url');

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
  if (result.type !== 'success') return 'cancelled';

  const params = readParams(result.url);
  if (params.error_code === 'identity_already_exists') return 'alreadyExists';
  if (params.error) throw new Error(params.error_description ?? params.error);
  if (!params.code) throw new Error('no code in redirect');
  const { error: exchangeError } = await auth.exchangeCodeForSession(
    params.code,
    params.flow_id ? { flowId: params.flow_id } : undefined,
  );
  if (exchangeError) throw exchangeError;
  return 'signedIn';
}

/** Query and fragment parameters of the redirect URL. */
function readParams(url: string): Record<string, string | undefined> {
  const out: Record<string, string> = {};
  const parts = url.split(/[?#]/).slice(1);
  for (const part of parts) new URLSearchParams(part).forEach((v, k) => (out[k] = v));
  return out;
}

/** Sign out on this phone only (the account and its data stay on the server). */
export async function signOut() {
  const { error } = await client().auth.signOut({ scope: 'local' });
  if (error) throw error;
}

/** Delete the account and everything on the server, then sign out on this phone. */
export async function deleteAccount() {
  const sb = client();
  const { error } = await sb.functions.invoke('delete-account', { method: 'POST', timeout: 30_000 });
  if (error) throw error;
  await sb.auth.signOut({ scope: 'local' });
}
