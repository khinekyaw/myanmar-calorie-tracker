import { formatGiftCode, GIFT_ALPHABET, isGiftCodeShape, newGiftCode, normalizeGiftCode } from '../giftCode';

describe('gift codes', () => {
  it('normalises like the server (supabase/tests/database/06_gift_codes.test.sql)', () => {
    expect(normalizeGiftCode(' k7q2m 9xh4t ')).toBe('K7Q2M9XH4T');
    expect(normalizeGiftCode('K7Q2M-9XH4T')).toBe('K7Q2M9XH4T');
    expect(normalizeGiftCode('OLDOL-DOLD0')).toBe('01D01D01D0');
    expect(normalizeGiftCode('sarai100')).toBe('SARA1100');
  });

  it('reads Burmese digits as digits', () => {
    expect(normalizeGiftCode('AB၁၂C-D၃')).toBe('AB12CD3');
  });

  it('groups by five as the user types', () => {
    expect(formatGiftCode('k7q2m9')).toBe('K7Q2M-9');
    expect(formatGiftCode('k7q2m9xh4t')).toBe('K7Q2M-9XH4T');
    expect(formatGiftCode('')).toBe('');
  });

  it('knows what is worth sending', () => {
    expect(isGiftCodeShape('ab-c')).toBe(false);
    expect(isGiftCodeShape('SARAI100')).toBe(true);
    expect(isGiftCodeShape('ထမင်း')).toBe(false);
  });

  it('makes codes from the unambiguous alphabet', () => {
    let n = 0;
    const code = newGiftCode((max) => n++ % max);
    expect(code).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/);
    expect(GIFT_ALPHABET).not.toMatch(/[ILOU]/);
    expect(normalizeGiftCode(code)).toBe(code.replace('-', ''));
  });
});
