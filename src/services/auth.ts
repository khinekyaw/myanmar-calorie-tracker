import { create } from 'zustand';

import { supabase } from './supabase';

/**
 * Accounts (docs/BACKEND.md → Auth). Everyone gets an anonymous account the
 * first time the phone is online, so their data syncs even if they skipped
 * sign-in. Signing in with a phone number links it to that account; if the
 * number already has an account, the phone switches to it and its local data
 * is merged in by the next sync.
 */

type AccountState = {
  userId: string | null;
  /** E.164 digits without "+", e.g. "959123456789"; null until signed in with a phone. */
  phone: string | null;
};

export const useAccount = create<AccountState>()(() => ({ userId: null, phone: null }));

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    useAccount.setState({ userId: session?.user.id ?? null, phone: session?.user.phone || null });
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

/** How the code that was sent must be checked. */
export type CodeRequest = { phone: string; mode: 'link' | 'signIn' };

/** Send a sign-in code by SMS. `phone` is E.164, e.g. "+959123456789". */
export async function requestCode(phone: string): Promise<CodeRequest> {
  const auth = client().auth;
  const { data } = await auth.getSession();
  if (data.session?.user.is_anonymous) {
    const { error } = await auth.updateUser({ phone });
    if (!error) return { phone, mode: 'link' };
    if (error.code !== 'phone_exists') throw error;
  }
  const { error } = await auth.signInWithOtp({ phone });
  if (error) throw error;
  return { phone, mode: 'signIn' };
}

export async function verifyCode(request: CodeRequest, token: string) {
  const { error } = await client().auth.verifyOtp({
    phone: request.phone,
    token,
    type: request.mode === 'link' ? 'phone_change' : 'sms',
  });
  if (error) throw error;
}

/** Delete the account and everything on the server, then sign out on this phone. */
export async function deleteAccount() {
  const sb = client();
  const { error } = await sb.functions.invoke('delete-account', { method: 'POST', timeout: 30_000 });
  if (error) throw error;
  await sb.auth.signOut({ scope: 'local' });
}
