import { shiftDay, weekStart } from '@/lib/dates';

import { weekReport, type ReportDay, type ReportInput } from '../weekReport';

// 2026-10-26 is a Monday.
const day = (d: string, patch: Partial<ReportDay> = {}): ReportDay => ({
  day: d,
  kcal: 2000,
  proteinG: 100,
  fatG: 60,
  ricePlates: 3,
  ...patch,
});

const week = (patch: Partial<ReportDay> = {}) =>
  Array.from({ length: 7 }, (_, i) => day(shiftDay('2026-10-26', i), patch));

const base: ReportInput = {
  weekStart: '2026-10-26',
  days: [],
  meals: [],
  weights: [],
  targets: { kcal: 2000, proteinG: 100, ricePlates: 3 },
  today: '2026-11-02',
};

describe('week helpers', () => {
  it('finds the Monday of any day', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });

  it('adds days across months and years', () => {
    expect(shiftDay('2026-10-26', 6)).toBe('2026-11-01');
    expect(shiftDay('2026-12-28', 7)).toBe('2027-01-04');
  });
});

describe('weekReport', () => {
  it('is empty for a week with nothing logged', () => {
    const r = weekReport(base);
    expect(r).toMatchObject({ weekEnd: '2026-11-01', complete: true, daysLogged: 0, avgKcal: 0, topDishes: [] });
    expect(r.weightChangeLb).toBeNull();
    expect(r.tip).toBe('logMore');
  });

  it('averages over logged days only and ignores other weeks', () => {
    const days = [
      day('2026-10-25', { kcal: 9000 }),
      day('2026-10-26', { kcal: 1800, ricePlates: 2.5 }),
      day('2026-10-28', { kcal: 2200, ricePlates: 3.5 }),
      day('2026-11-02', { kcal: 9000 }),
    ];
    const r = weekReport({ ...base, days });
    expect(r).toMatchObject({ daysLogged: 2, avgKcal: 2000, avgRicePlates: 3 });
  });

  it('counts on-target and over days among finished days', () => {
    const days = [
      day('2026-10-26', { kcal: 2000 }),
      day('2026-10-27', { kcal: 1700 }),
      day('2026-10-28', { kcal: 2200 }),
      day('2026-10-29', { kcal: 1000 }),
    ];
    expect(weekReport({ ...base, days })).toMatchObject({ onTargetDays: 2, overDays: 1 });
    // Today isn't over yet.
    expect(weekReport({ ...base, days, today: '2026-10-28' })).toMatchObject({
      complete: false,
      onTargetDays: 2,
      overDays: 0,
    });
  });

  it('measures weight from the last weigh-in before the week', () => {
    const weights = [
      { day: '2026-10-20', lb: 160 },
      { day: '2026-10-27', lb: 159.4 },
      { day: '2026-10-31', lb: 158.8 },
    ];
    expect(weekReport({ ...base, weights }).weightChangeLb).toBe(-1.2);
    expect(weekReport({ ...base, weights: weights.slice(1) }).weightChangeLb).toBe(-0.6);
    expect(weekReport({ ...base, weights: weights.slice(2) }).weightChangeLb).toBeNull();
    expect(weekReport({ ...base, weights: weights.slice(0, 1) }).weightChangeLb).toBeNull();
  });

  it('ranks dishes by the meals they were in', () => {
    const meals = [
      { day: '2026-10-26', dishIds: ['tea', 'palata'] },
      { day: '2026-10-27', dishIds: ['tea', 'tea'] },
      { day: '2026-10-28', dishIds: ['mohinga'] },
      { day: '2026-10-29', dishIds: ['palata', 'tea'] },
      { day: '2026-10-30', dishIds: ['riceCurry'] },
      { day: '2026-11-03', dishIds: ['riceCurry', 'riceCurry'] },
    ];
    expect(weekReport({ ...base, meals }).topDishes).toEqual([
      { dishId: 'tea', count: 3 },
      { dishId: 'palata', count: 2 },
      { dishId: 'mohinga', count: 1 },
    ]);
  });

  describe('tip', () => {
    const tip = (patch: Partial<ReportDay>, input: Partial<ReportInput> = {}) =>
      weekReport({ ...base, days: week(patch), ...input }).tip;

    it('asks to log more when few days are logged', () => {
      expect(weekReport({ ...base, days: week().slice(0, 3) }).tip).toBe('logMore');
      // Mid-week, two finished days both logged is fine.
      expect(weekReport({ ...base, days: week().slice(0, 2), today: '2026-10-28' }).tip).toBe('keepGoing');
      expect(weekReport({ ...base, days: week().slice(0, 1), today: '2026-10-28' }).tip).toBe('logMore');
    });

    it('picks the first rule that applies', () => {
      expect(tip({ ricePlates: 4, proteinG: 50 })).toBe('lessRice');
      expect(tip({ proteinG: 70 })).toBe('moreProtein');
      expect(tip({ kcal: 2300 })).toBe('overKcal');
      expect(tip({ kcal: 1500 })).toBe('underKcal');
      expect(tip({})).toBe('keepGoing');
    });
  });
});

describe('weekReport health lines', () => {
  const meal = (d: string, sugarHeavy = false) => ({ day: d, dishIds: ['tea'], sugarHeavy });

  it('counts sugar-heavy meals, the days they fall on, and days over the sodium budget', () => {
    const r = weekReport({
      ...base,
      days: [day('2026-10-26', { sodiumMg: 2500 }), day('2026-10-27', { sodiumMg: 1500 }), day('2026-10-28')],
      meals: [meal('2026-10-26', true), meal('2026-10-26', true), meal('2026-10-27'), meal('2026-10-28', true), meal('2026-11-02', true)],
    });
    expect(r).toMatchObject({ sugarHeavyMeals: 3, sugarHeavyDays: 2, saltyDays: 1 });
  });

  it('tips on sugar or salt only for users who track it', () => {
    const days = week({ sodiumMg: 2500 });
    const meals = days.map((d) => meal(d.day, true));
    expect(weekReport({ ...base, days, meals }).tip).toBe('keepGoing');
    expect(weekReport({ ...base, days, meals, health: { bloodSugar: true, bloodPressure: true } }).tip).toBe('lessSugar');
    expect(weekReport({ ...base, days, meals, health: { bloodSugar: false, bloodPressure: true } }).tip).toBe('lessSalt');
  });
});
