import { BADGES, calorieDay, evaluateBadges, longestStreak, type BadgeInput, type BadgeMeal } from '../badges';

const meal = (day: string, patch: Partial<BadgeMeal> = {}): BadgeMeal => ({
  day,
  hour: 13,
  source: 'search',
  dishIds: ['rice'],
  shared: false,
  ...patch,
});

const base: BadgeInput = {
  meals: [],
  days: [],
  feastDays: [],
  weights: [{ day: '2026-10-01', lb: 160 }],
  goal: 'lose',
  targetLb: 150,
  targets: { kcal: 2000, proteinG: 100, ricePlates: 3 },
  today: '2026-10-30',
};

const status = (input: Partial<BadgeInput>, id: string) => {
  const found = evaluateBadges({ ...base, ...input }).find((b) => b.id === id);
  if (!found) throw new Error(`no badge ${id}`);
  return found;
};

describe('evaluateBadges', () => {
  it('lists every badge once, with nothing earned for a new user', () => {
    const all = evaluateBadges(base);
    expect(all).toHaveLength(BADGES.length);
    expect(new Set(all.map((b) => b.id)).size).toBe(BADGES.length);
    expect(all.filter((b) => b.earnedOn)).toEqual([]);
  });

  it('keeps the best streak and the day it was reached', () => {
    const meals = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10'].map((d) => meal(d));
    expect(status({ meals }, 'streak3')).toMatchObject({ current: 3, earnedOn: '2026-10-03' });
    expect(status({ meals }, 'streak7')).toMatchObject({ current: 3, earnedOn: null });
  });

  it('lets a feast day bridge a streak', () => {
    const meals = [meal('2026-10-01'), meal('2026-10-03')];
    expect(status({ meals, feastDays: ['2026-10-02'] }, 'streak3').earnedOn).toBe('2026-10-03');
    expect(longestStreak({ meals, feastDays: [] })).toBe(1);
  });

  it('counts meals and dates the nth one', () => {
    const meals = Array.from({ length: 12 }, (_, i) => meal(`2026-10-${String(i + 1).padStart(2, '0')}`));
    expect(status({ meals }, 'meals1').earnedOn).toBe('2026-10-01');
    expect(status({ meals }, 'meals10')).toMatchObject({ current: 10, earnedOn: '2026-10-10' });
    expect(status({ meals }, 'meals50')).toMatchObject({ current: 12, earnedOn: null });
  });

  it('needs breakfast, lunch and dinner on the same day', () => {
    const two = [meal('2026-10-05', { hour: 8 }), meal('2026-10-05', { hour: 13 })];
    expect(status({ meals: two }, 'threeMeals').earnedOn).toBeNull();
    expect(status({ meals: [...two, meal('2026-10-05', { hour: 19 })] }, 'threeMeals').earnedOn).toBe('2026-10-05');
  });

  it('counts mohinga only before noon', () => {
    const late = Array.from({ length: 5 }, (_, i) => meal(`2026-10-0${i + 1}`, { hour: 18, dishIds: ['mohinga'] }));
    expect(status({ meals: late }, 'mohingaMorning').current).toBe(0);
    const early = late.map((m) => ({ ...m, hour: 7 }));
    expect(status({ meals: early }, 'mohingaMorning').earnedOn).toBe('2026-10-05');
  });

  it('awards the way of logging', () => {
    expect(status({ meals: [meal('2026-10-02', { source: 'photo' })] }, 'firstScan').earnedOn).toBe('2026-10-02');
    expect(status({ meals: [meal('2026-10-02', { source: 'photo' })] }, 'firstVoice').earnedOn).toBeNull();
  });

  it('ignores today for calorie days, since the day is not over', () => {
    const days = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'].map(
      (day) => ({ day, kcal: 1900, proteinG: 50, ricePlates: 4 }),
    );
    expect(status({ days }, 'onTarget')).toMatchObject({ current: 6, earnedOn: null });
    expect(status({ days, today: '2026-10-31' }, 'onTarget').earnedOn).toBe('2026-10-30');
    expect(status({ days, today: '2026-10-31' }, 'riceInCheck').current).toBe(0);
  });

  it('does not count the onboarding weight as a weigh-in', () => {
    expect(status({}, 'firstWeighIn').current).toBe(0);
    const weights = [...base.weights, { day: '2026-10-08', lb: 158 }];
    expect(status({ weights }, 'firstWeighIn').earnedOn).toBe('2026-10-08');
  });

  it('counts weigh-in weeks, not weigh-ins', () => {
    // 10-01 Thu, 10-02 Fri (same week), 10-06 Tue, 10-13 Tue, 10-20 Tue.
    const weights = ['2026-10-01', '2026-10-02', '2026-10-06', '2026-10-13', '2026-10-20'].map((day) => ({ day, lb: 160 }));
    expect(status({ weights }, 'weeklyCheckIn')).toMatchObject({ current: 4, earnedOn: '2026-10-20' });
  });

  it('keeps weight badges once reached, even after a gain', () => {
    const weights = [
      { day: '2026-10-01', lb: 160 },
      { day: '2026-10-15', lb: 154 },
      { day: '2026-10-29', lb: 157 },
    ];
    expect(status({ weights }, 'first5lb')).toMatchObject({ current: 5, earnedOn: '2026-10-15' });
    expect(status({ weights }, 'halfway')).toMatchObject({ current: 50, earnedOn: '2026-10-15' });
    expect(status({ weights }, 'goalReached').earnedOn).toBeNull();
  });

  it('works for a gain goal', () => {
    const weights = [
      { day: '2026-10-01', lb: 120 },
      { day: '2026-10-20', lb: 130 },
    ];
    expect(status({ weights, goal: 'gain', targetLb: 130 }, 'goalReached').earnedOn).toBe('2026-10-20');
  });

  it('hides weight-goal badges while maintaining', () => {
    expect(status({ goal: 'maintain' }, 'first5lb').available).toBe(false);
    expect(status({ goal: 'maintain' }, 'firstWeighIn').available).toBe(true);
  });
});

describe('calorieDay', () => {
  it('sorts a day by its share of the target', () => {
    expect(calorieDay(0, 2000)).toBe('none');
    expect(calorieDay(1600, 2000)).toBe('under');
    expect(calorieDay(1700, 2000)).toBe('onTarget');
    expect(calorieDay(2100, 2000)).toBe('onTarget');
    expect(calorieDay(2101, 2000)).toBe('over');
  });
});
