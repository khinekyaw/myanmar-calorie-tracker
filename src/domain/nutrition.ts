/**
 * Pure nutrition maths. No React, no I/O — easy to unit test.
 * Numbers marked PLACEHOLDER must be validated by the nutritionist.
 */

export type Sex = 'male' | 'female';
export type Workday = 'office' | 'shop' | 'physical' | 'home';

/** PLACEHOLDER: kcal in one standard plate of cooked rice (~200 g). */
export const KCAL_PER_RICE_PLATE = 260;

/** Activity multipliers for the Mifflin-St Jeor BMR, by type of workday. */
export const ACTIVITY_FACTOR: Record<Workday, number> = {
  office: 1.3,
  home: 1.4,
  shop: 1.5,
  physical: 1.7,
};

export function bmrMifflinStJeor(p: { sex: Sex; weightKg: number; heightCm: number; age: number }) {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function dailyKcal(p: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  workday: Workday;
}) {
  return Math.round(bmrMifflinStJeor(p) * ACTIVITY_FACTOR[p.workday]);
}

export function bmi(weightKg: number, heightCm: number) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export type BmiCategory = 'under' | 'normal' | 'over' | 'obese';

/** WHO cut-offs for Asian populations: 18.5 / 23 / 27.5. */
export const ASIAN_BMI_CUTOFFS = { normal: 18.5, over: 23, obese: 27.5 } as const;

export function asianBmiCategory(value: number): BmiCategory {
  if (value < ASIAN_BMI_CUTOFFS.normal) return 'under';
  if (value < ASIAN_BMI_CUTOFFS.over) return 'normal';
  if (value < ASIAN_BMI_CUTOFFS.obese) return 'over';
  return 'obese';
}

/** Convert carb kcal into plates of rice, rounded to the nearest half plate. */
export function kcalToRicePlates(kcal: number) {
  return Math.round((kcal / KCAL_PER_RICE_PLATE) * 2) / 2;
}
