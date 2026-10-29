import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Sex, Workday } from '@/domain/nutrition';
import { syncStorage } from '@/lib/storage';

/** Answers collected during onboarding (imperial inputs, as the user typed them). */
export type OnboardingDraft = {
  sex: Sex | null;
  birthYear: string;
  heightFt: string;
  heightIn: string;
  weightLb: string;
  workday: Workday | null;
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
    { name: 'onboarding', storage: syncStorage, version: 1 },
  ),
);
