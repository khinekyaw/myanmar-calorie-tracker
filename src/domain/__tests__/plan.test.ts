import { asianBmiCategory, bmi, kcalToRicePlates } from '../nutrition';
import { buildPlan, type PlanInput } from '../plan';

const base: PlanInput = {
  sex: 'female',
  birthYear: 1998,
  heightFt: 5,
  heightIn: 4,
  weightLb: 140,
  workday: 'office',
  goal: 'lose',
  targetWeightLb: 125,
  pace: 1,
};
const today = new Date('2026-10-29T00:00:00Z');

describe('buildPlan', () => {
  it('puts a 1 lb/week loss ~500 kcal under maintenance', () => {
    const lose = buildPlan(base, today);
    const keep = buildPlan({ ...base, goal: 'maintain' }, today);
    expect(keep.kcal - lose.kcal).toBeGreaterThanOrEqual(490);
    expect(keep.kcal - lose.kcal).toBeLessThanOrEqual(510);
  });

  it('never goes below the minimum for the sex', () => {
    const plan = buildPlan({ ...base, weightLb: 95, heightFt: 4, heightIn: 10, pace: 2 }, today);
    expect(plan.kcal).toBeGreaterThanOrEqual(1200);
  });

  it('macros add up to the calorie target (±1%)', () => {
    const p = buildPlan(base, today);
    const kcal = p.proteinG * 4 + p.fatG * 9 + p.carbG * 4;
    expect(Math.abs(kcal - p.kcal) / p.kcal).toBeLessThan(0.01);
  });

  it('cuts rice gradually by half plates when losing', () => {
    const { riceSteps, ricePlates } = buildPlan(base, today);
    expect(riceSteps).toEqual([ricePlates + 1, ricePlates + 0.5, ricePlates]);
  });

  it('dates the target by weeks of pace, none when maintaining', () => {
    const { targetDate } = buildPlan(base, today);
    const weeks = (targetDate!.getTime() - today.getTime()) / (7 * 24 * 3600 * 1000);
    expect(weeks).toBe(15);
    expect(buildPlan({ ...base, goal: 'maintain' }, today).targetDate).toBeNull();
  });
});

describe('nutrition helpers', () => {
  it('uses Asian BMI cut-offs', () => {
    expect(asianBmiCategory(22.9)).toBe('normal');
    expect(asianBmiCategory(23)).toBe('over');
    expect(asianBmiCategory(27.5)).toBe('obese');
    expect(asianBmiCategory(18.4)).toBe('under');
  });

  it('computes BMI', () => {
    expect(bmi(62.6, 162.6)).toBeCloseTo(23.7, 1);
  });

  it('rounds rice plates to the nearest half', () => {
    expect(kcalToRicePlates(260)).toBe(1);
    expect(kcalToRicePlates(400)).toBe(1.5);
  });
});
