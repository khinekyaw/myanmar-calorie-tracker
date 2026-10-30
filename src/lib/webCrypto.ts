import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';

/**
 * Minimal Web Crypto for Hermes, which has none: Supabase's Google sign-in
 * (PKCE) needs `crypto.getRandomValues` and `crypto.subtle.digest('SHA-256')`.
 * Without them it falls back to Math.random and a plain (unhashed) challenge.
 * Import once, before the Supabase client is created.
 */
type MinimalCrypto = {
  getRandomValues: typeof getRandomValues;
  subtle: { digest: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer> };
};

const g = globalThis as unknown as { crypto?: Partial<MinimalCrypto> };

if (!g.crypto?.getRandomValues || !g.crypto.subtle) {
  g.crypto = {
    getRandomValues,
    subtle: {
      digest: (algorithm, data) => {
        if (algorithm !== 'SHA-256') throw new Error(`digest ${algorithm} not supported`);
        return digest(CryptoDigestAlgorithm.SHA256, data);
      },
    },
  };
}
