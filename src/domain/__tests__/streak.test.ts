import { streakDays } from '../streak';

const key = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date('2026-10-30T12:00:00Z');
const days = (...keys: string[]) => new Set(keys);

describe('streakDays', () => {
  it('counts consecutive logged days ending today', () => {
    expect(streakDays(days('2026-10-30', '2026-10-29', '2026-10-28'), days(), today, key)).toBe(3);
  });

  it('does not break when today is not logged yet', () => {
    expect(streakDays(days('2026-10-29', '2026-10-28'), days(), today, key)).toBe(2);
  });

  it('stops at a gap', () => {
    expect(streakDays(days('2026-10-30', '2026-10-28'), days(), today, key)).toBe(1);
  });

  it('feast days keep the streak alive', () => {
    expect(streakDays(days('2026-10-30', '2026-10-28'), days('2026-10-29'), today, key)).toBe(3);
  });
});
