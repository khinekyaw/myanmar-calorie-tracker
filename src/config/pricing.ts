/**
 * Prepaid passes (no auto-renew), in kyat.
 * MOCK prices for the prototype — not decided; see docs/DECISIONS.md → Open.
 */
export const PASSES = [
  { id: '1m', months: 1, priceKs: 4900 },
  { id: '3m', months: 3, priceKs: 12900, bestValue: true },
] as const;

export type PassId = (typeof PASSES)[number]['id'];

export const PAYMENT_PROVIDERS = ['KBZPay', 'WavePay'] as const;
