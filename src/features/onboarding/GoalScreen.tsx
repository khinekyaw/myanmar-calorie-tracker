import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { Goal } from '@/domain/plan';
import { useOnboarding } from '@/store/onboarding';
import { OptionCard } from '@/ui';

import { OnboardingLayout } from './OnboardingLayout';

const GOALS: Goal[] = ['lose', 'maintain', 'gain'];

/**
 * Weight goal. Blood sugar / pressure aren't asked here: they're Premium,
 * turned on in Settings → Health (docs/DECISIONS.md → "Gold crown on Premium features").
 */
export function GoalScreen() {
  const { t } = useTranslation();
  const goal = useOnboarding((st) => st.goal);
  const update = useOnboarding((st) => st.update);

  return (
    <OnboardingLayout
      step={3}
      title={t('goal.title')}
      canContinue={goal !== null}
      onContinue={() => router.push(goal === 'maintain' ? '/eating' : '/target-weight')}>
      {GOALS.map((g) => (
        <OptionCard
          key={g}
          label={t(`goal.${g}`)}
          selected={goal === g}
          onPress={() => update({ goal: g, targetWeightLb: null })}
        />
      ))}
    </OnboardingLayout>
  );
}
