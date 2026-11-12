import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Sex, Workday } from '@/domain/nutrition';
import type { Goal, Pace, PlanInput } from '@/domain/plan';
import { syncStorage } from '@/lib/storage';

export type HealthFlag = 'bloodSugar' | 'bloodPressure';
export type EatingPlace = 'homeShared' | 'riceShop' | 'teaShop' | 'street' | 'delivery';

/** Answers collected during onboarding (imperial inputs, as the user typed them). */
export type OnboardingDraft = {
  sex: Sex | null;
  birthYear: string;
  heightFt: string;
  heightIn: string;
  weightLb: string;
  workday: Workday | null;
  goal: Goal | null;
  healthFlags: HealthFlag[];
  targetWeightLb: number | null;
  pace: Pace;
  eatingPlaces: EatingPlace[];
};

type OnboardingState = OnboardingDraft & {
  completed: boolean;
  update: (patch: Partial<OnboardingDraft>) => void;
  complete: () => void;
  reset: () => void;
};

const empty: OnboardingDraft = {
  sex: null,
  birthYear: '',
  heightFt: '',
  heightIn: '',
  weightLb: '',
  workday: null,
  goal: null,
  healthFlags: [],
  targetWeightLb: null,
  pace: 1,
  eatingPlaces: [],
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      ...empty,
      completed: false,
      update: (patch) => set(patch),
      complete: () => set({ completed: true }),
      reset: () => set({ ...empty, completed: false }),
    }),
    {
      name: 'onboarding',
      storage: syncStorage,
      version: 2,
      // v1 had no goal/target/eating answers: keep what was saved, fill the rest.
      migrate: (persisted) => ({ ...empty, completed: false, ...(persisted as Partial<OnboardingState>) }),
    },
  ),
);

/** Build the plan input from the draft, or null if something is missing. */
export function draftToPlanInput(d: OnboardingDraft): PlanInput | null {
  if (!d.sex || !d.workday || !d.goal || !d.birthYear || !d.heightFt || !d.weightLb) return null;
  const weightLb = Number(d.weightLb);
  return {
    sex: d.sex,
    birthYear: Number(d.birthYear),
    heightFt: Number(d.heightFt),
    heightIn: Number(d.heightIn || 0),
    weightLb,
    workday: d.workday,
    goal: d.goal,
    targetWeightLb: d.goal === 'maintain' ? weightLb : (d.targetWeightLb ?? weightLb),
    pace: d.pace,
    bloodSugar: d.healthFlags.includes('bloodSugar'),
  };
}
