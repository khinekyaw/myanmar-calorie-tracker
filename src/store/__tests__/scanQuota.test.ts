import { FREE_SCANS_FIRST_WEEK, FREE_SCANS_PER_DAY, freeScansFor } from '../scanQuota';

describe('freeScansFor', () => {
  it('gives the first-week allowance for 7 days, then the daily one', () => {
    expect(freeScansFor('2026-11-01', '2026-11-01')).toBe(FREE_SCANS_FIRST_WEEK);
    expect(freeScansFor('2026-11-01', '2026-11-07')).toBe(FREE_SCANS_FIRST_WEEK);
    expect(freeScansFor('2026-11-01', '2026-11-08')).toBe(FREE_SCANS_PER_DAY);
    expect(freeScansFor('2026-10-01', '2026-11-01')).toBe(FREE_SCANS_PER_DAY);
  });

  it('matches the server defaults (scan function: 3 then 1)', () => {
    expect([FREE_SCANS_FIRST_WEEK, FREE_SCANS_PER_DAY]).toEqual([3, 1]);
  });
});
