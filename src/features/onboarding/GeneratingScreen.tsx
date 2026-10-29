import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildPlan } from '@/domain/plan';
import { formatNumber } from '@/lib/format';
import { draftToPlanInput, useOnboarding } from '@/store/onboarding';
import { usePlan } from '@/store/plan';
import { useWeights } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { ProgressBar, Screen, Text } from '@/ui';

const DURATION_MS = 2200;

/** Counts to 100% while the plan is computed (instantly, locally), then shows it. */
export function GeneratingScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const input = draftToPlanInput(useOnboarding.getState());
    if (input) {
      usePlan.getState().setPlan(buildPlan(input));
      // The onboarding weight becomes today's first point on the Progress chart.
      useWeights.getState().log('weight', input.weightLb);
    }

    const start = Date.now();
    const timer = setInterval(() => {
      const p = Math.min((Date.now() - start) / DURATION_MS, 1);
      // Ease out so it slows near the end.
      setPercent(Math.round((1 - (1 - p) ** 2) * 100));
      if (p >= 1) {
        clearInterval(timer);
        router.replace('/plan-ready');
      }
    }, 40);
    return () => clearInterval(timer);
  }, []);

  return (
    <Screen>
      <View style={s.center} accessibilityLiveRegion="polite">
        <Text variant="numberXl" style={s.percent}>
          {formatNumber(percent, language)}%
        </Text>
        <View style={s.bar}>
          <ProgressBar value={percent / 100} />
        </View>
        <Text variant="body" tone="muted">
          {t('generating.title')}
        </Text>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.xxl, paddingHorizontal: theme.space.xl },
  percent: { fontSize: 76, lineHeight: 84, letterSpacing: -3 },
  bar: { width: '100%', flexDirection: 'row' },
}));
