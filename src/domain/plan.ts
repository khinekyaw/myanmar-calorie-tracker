import { dailyKcal, KCAL_PER_RICE_PLATE, type Sex, type Workday } from './nutrition';
import { ftInToCm, lbToKg } from './units';

/**
 * Daily plan from onboarding answers. Pure function — no React.
 * PLACEHOLDER rules (protein per kg, fat share, deficit caps) must be
 * reviewed by the nutritionist; they're centralised here for that reason.
 */

export type Goal = 'lose' | 'maintain' | 'gain';
export type Pace = 0.5 | 1 | 2; // lb per week
export const PACES: Pace[] = [0.5, 1, 2];

export type PlanInput = {
  sex: Sex;
  birthYear: number;
  heightFt: number;
  heightIn: number;
  weightLb: number;
  workday: Workday;
  goal: Goal;
  targetWeightLb: number;
  pace: Pace;
};

export type Plan = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  /** Carbs expressed as plates of rice, rounded to ½. */
  ricePlates: number;
  /** Gradual rice cut, e.g. [4, 3.5, 3]. Last value = target. */
  riceSteps: number[];
  /** Expected date to reach the target weight (null for "maintain"). */
  targetDate: Date | null;
};

const KCAL_PER_LB = 3500;
const PROTEIN_G_PER_KG = 1.6;
const FAT_SHARE = 0.25;
const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };

const roundHalf = (n: number) => Math.round(n * 2) / 2;
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function buildPlan(input: PlanInput, today = new Date()): Plan {
  const weightKg = lbToKg(input.weightLb);
  const heightCm = ftInToCm(input.heightFt, input.heightIn);
  const age = today.getFullYear() - input.birthYear;

  const maintenance = dailyKcal({ sex: input.sex, weightKg, heightCm, age, workday: input.workday });
  const delta = (input.pace * KCAL_PER_LB) / 7;
  const raw =
    input.goal === 'lose'
      ? maintenance - delta
      : input.goal === 'gain'
        ? maintenance + Math.min(delta, 500)
        : maintenance;
  const kcal = roundTo(Math.max(raw, MIN_KCAL[input.sex]), 10);

  const proteinG = Math.round(Math.min(PROTEIN_G_PER_KG * weightKg, (kcal * 0.35) / 4));
  const fatG = Math.round((kcal * FAT_SHARE) / 9);
  const carbG = Math.max(Math.round((kcal - proteinG * 4 - fatG * 9) / 4), 0);
  const ricePlates = Math.max(roundHalf((carbG * 4) / KCAL_PER_RICE_PLATE), 0.5);

  // Cut rice gradually (½ plate a step) when losing weight.
  const riceSteps = input.goal === 'lose' ? [ricePlates + 1, ricePlates + 0.5, ricePlates] : [ricePlates];

  const lbToGo = Math.abs(input.weightLb - input.targetWeightLb);
  const targetDate =
    input.goal === 'maintain' || lbToGo === 0
      ? null
      : new Date(today.getTime() + Math.ceil(lbToGo / input.pace) * 7 * 24 * 3600 * 1000);

  return { kcal, proteinG, fatG, carbG, ricePlates, riceSteps, targetDate };
}
