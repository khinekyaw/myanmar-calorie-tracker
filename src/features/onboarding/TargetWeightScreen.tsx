import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildPlan, PACES } from '@/domain/plan';
import { formatMonthYear, formatNumber, formatPlates } from '@/lib/format';
import { draftToPlanInput, useOnboarding } from '@/store/onboarding';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Segmented, Stepper, Text } from '@/ui';

import { OnboardingLayout } from './OnboardingLayout';

/** Target weight (± stepper, 1 lb) and weekly pace (½ / 1 / 2 lb). */
export function TargetWeightScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const draft = useOnboarding();
  const { goal, pace, targetWeightLb, update } = draft;
  const current = Number(draft.weightLb) || 140;

  // Start 10 lb away from the current weight, in the goal's direction.
  useEffect(() => {
    if (targetWeightLb === null) update({ targetWeightLb: goal === 'gain' ? current + 10 : current - 10 });
  }, [targetWeightLb, goal, current, update]);

  const target = targetWeightLb ?? current;
  const input = draftToPlanInput(draft);
  const date = input ? buildPlan({ ...input, targetWeightLb: target }).targetDate : null;
  const min = goal === 'gain' ? current + 1 : 70;
  const max = goal === 'gain' ? 400 : current - 1;

  return (
    <OnboardingLayout step={4} title={t('target.title')} onContinue={() => router.push('/eating')}>
      <View style={s.center}>
        <Stepper
          variant="large"
          value={target}
          min={min}
          max={max}
          display={formatNumber(target, language)}
          unit={t('common.lb')}
          onChange={(v) => update({ targetWeightLb: v })}
          decreaseLabel={t('target.decrease')}
          increaseLabel={t('target.increase')}
        />
      </View>
      <View style={s.pace}>
        <Text variant="label" tone="muted" align="center">
          {t('target.perWeek')}
        </Text>
        <Segmented
          tone="light"
          size="lg"
          accessibilityLabel={t('target.perWeek')}
          value={String(pace)}
          onChange={(v) => update({ pace: Number(v) as typeof pace })}
          options={PACES.map((p) => ({ value: String(p), label: formatPlates(p, language) }))}
        />
        {date && (
          <Text variant="label" tone="muted" align="center">
            {t('target.reachBy', { date: formatMonthYear(date, language) })}
          </Text>
        )}
      </View>
    </OnboardingLayout>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  center: { alignItems: 'center', marginBottom: theme.space.xxxl },
  pace: { gap: theme.space.md },
}));
