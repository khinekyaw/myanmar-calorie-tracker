import { formatFixed, formatPlates } from '../format';

describe('formatFixed', () => {
  it('always shows one decimal so the width stays the same', () => {
    expect(formatFixed(190, 'en')).toBe('190.0');
    expect(formatFixed(136.75, 'en')).toBe('136.8');
    expect(formatFixed(99.95, 'my')).toBe('100.0');
  });
});

describe('formatPlates', () => {
  it('uses fraction glyphs for halves and quarters', () => {
    expect(formatPlates(2.5, 'en')).toBe('2½');
    expect(formatPlates(0.25, 'en')).toBe('¼');
    expect(formatPlates(3, 'en')).toBe('3');
  });
});
