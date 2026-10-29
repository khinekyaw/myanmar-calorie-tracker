import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Plan } from '@/domain/plan';
import { syncStorage } from '@/lib/storage';

type StoredPlan = Omit<Plan, 'targetDate'> & { targetDate: string | null };

/** PLACEHOLDER plan for users who skip onboarding ("I have an account"). */
const fallback: StoredPlan = {
  kcal: 1935,
  proteinG: 117,
  fatG: 54,
  carbG: 245,
  ricePlates: 3.5,
  riceSteps: [3.5],
  targetDate: null,
};

type PlanState = {
  plan: StoredPlan;
  setPlan: (plan: Plan) => void;
};

/** The user's daily targets, computed at the end of onboarding. */
export const usePlan = create<PlanState>()(
  persist(
    (set) => ({
      plan: fallback,
      setPlan: (plan) => set({ plan: { ...plan, targetDate: plan.targetDate?.toISOString() ?? null } }),
    }),
    { name: 'plan', storage: syncStorage, version: 1 },
  ),
);
