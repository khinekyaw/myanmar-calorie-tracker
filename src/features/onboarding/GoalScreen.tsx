import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Goal } from '@/domain/plan';
import { useOnboarding, type HealthFlag } from '@/store/onboarding';
import { makeStyles } from '@/theme/ThemeProvider';
import { Chip, OptionCard } from '@/ui';

import { OnboardingLayout } from './OnboardingLayout';

const GOALS: Goal[] = ['lose', 'maintain', 'gain'];
const FLAGS: HealthFlag[] = ['bloodSugar', 'bloodPressure'];

export function GoalScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const goal = useOnboarding((st) => st.goal);
  const flags = useOnboarding((st) => st.healthFlags);
  const update = useOnboarding((st) => st.update);

  const toggleFlag = (f: HealthFlag) =>
    update({ healthFlags: flags.includes(f) ? flags.filter((x) => x !== f) : [...flags, f] });

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
      <View style={s.flags} accessibilityLabel={t('goal.health')}>
        {FLAGS.map((f) => (
          <Chip
            key={f}
            look="outline"
            icon={flags.includes(f) ? 'check' : 'plus'}
            label={t(`goal.${f}`)}
            selected={flags.includes(f)}
            onPress={() => toggleFlag(f)}
          />
        ))}
      </View>
    </OnboardingLayout>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm, marginTop: theme.space.md },
}));
