import { formatDayLabel, formatDayRange, formatFixed, formatPlates } from '../format';

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

describe('dates', () => {
  const oct27 = new Date(2026, 9, 27);
  const nov2 = new Date(2026, 10, 2);

  it('show month, day and year, without the weekday', () => {
    expect(formatDayLabel(oct27, 'en')).toBe('Oct 27, 2026');
    expect(formatDayLabel(oct27, 'my')).toBe('အောက်တိုဘာ 27၊ 2026');
  });

  it('give the year once in a range, twice across a new year', () => {
    expect(formatDayRange(oct27, nov2, 'en')).toBe('Oct 27 – Nov 2, 2026');
    expect(formatDayRange(oct27, nov2, 'my')).toBe('အောက်တိုဘာ 27 – နိုဝင်ဘာ 2၊ 2026');
    expect(formatDayRange(new Date(2026, 11, 29), new Date(2027, 0, 4), 'en')).toBe('Dec 29, 2026 – Jan 4, 2027');
  });
});
