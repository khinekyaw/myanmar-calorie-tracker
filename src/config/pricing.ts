/** Prepaid passes (no auto-renew). PLACEHOLDER prices until decided. */
export const PASSES = [
  { id: '1m', months: 1, priceKs: '[PRICE]' },
  { id: '3m', months: 3, priceKs: '[PRICE]', bestValue: true },
] as const;

export type PassId = (typeof PASSES)[number]['id'];

export const PAYMENT_PROVIDERS = ['KBZPay', 'WavePay'] as const;
