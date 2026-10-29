import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildPlan, type Plan } from '@/domain/plan';
import { syncStorage } from '@/lib/storage';

import { draftToPlanInput, useOnboarding } from './onboarding';
import { series, useWeights } from './weights';

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

/** Back to the default plan (after the account is deleted). */
export const resetPlan = () => usePlan.setState({ plan: fallback });

/**
 * Recompute the plan from the saved profile, using the latest logged weight.
 * Call after anything that changes the inputs (weight log, goal, body details).
 */
export function refreshPlan() {
  const profile = useOnboarding.getState();
  const latest = series(useWeights.getState().entries, 'weight').at(-1);
  const input = draftToPlanInput({ ...profile, weightLb: latest ? String(latest.value) : profile.weightLb });
  if (input) usePlan.getState().setPlan(buildPlan(input));
}
