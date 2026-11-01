import { dayKey, daysBetween, fromDayKey, monthGrid, shiftDay, weekDates, weekStart } from '../dates';

describe('day keys', () => {
  it('round-trip a local date', () => {
    expect(dayKey(fromDayKey('2026-11-02'))).toBe('2026-11-02');
  });

  it('shift by days across month and year ends', () => {
    expect(shiftDay('2026-11-02', -1)).toBe('2026-11-01');
    expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('monthGrid', () => {
  it('starts weeks on Monday and pads both ends', () => {
    // November 2026 starts on a Sunday and has 30 days.
    const weeks = monthGrid(2026, 10);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks[weeks.length - 1]).toEqual(['2026-11-30', null, null, null, null, null, null]);
    expect(weeks).toHaveLength(6);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it('needs no padding when the month starts on Monday', () => {
    // June 2026 starts on a Monday.
    expect(monthGrid(2026, 5)[0][0]).toBe('2026-06-01');
  });
});

describe('weeks', () => {
  it('start on Monday', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // a Sunday
    expect(weekStart('2026-11-02')).toBe('2026-11-02'); // a Monday
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });

  it('list the seven dates Monday first', () => {
    expect(weekDates(new Date(2026, 10, 1, 15)).map(dayKey)).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ]);
  });

  it('count days between', () => {
    expect(daysBetween('2026-10-26', '2026-11-02')).toBe(7);
    expect(daysBetween('2026-11-02', '2026-10-26')).toBe(-7);
  });
});
