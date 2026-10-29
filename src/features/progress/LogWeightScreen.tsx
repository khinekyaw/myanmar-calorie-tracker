import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDayLabel, formatNumber } from '@/lib/format';
import { refreshPlan } from '@/store/plan';
import { fromDayKey, useLatest, useWeights, type Metric } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, IconButton, Screen, Segmented, Stepper, Text } from '@/ui';

const STEP: Record<Metric, number> = { weight: 0.5, waist: 0.25 };
const DEFAULT: Record<Metric, number> = { weight: 140, waist: 32 };

/** Log today's weight or waist (homes without a scale can track waist instead). */
export function LogWeightScreen() {
  const params = useLocalSearchParams<{ metric?: Metric }>();
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const log = useWeights((st) => st.log);
  const [metric, setMetric] = useState<Metric>(params.metric === 'waist' ? 'waist' : 'weight');
  const lastWeight = useLatest('weight');
  const lastWaist = useLatest('waist');
  const last = metric === 'weight' ? lastWeight : lastWaist;
  const [values, setValues] = useState<Record<Metric, number>>({
    weight: lastWeight?.value ?? DEFAULT.weight,
    waist: lastWaist?.value ?? DEFAULT.waist,
  });
  const unit = metric === 'weight' ? t('common.lb') : t('common.inch');

  const save = () => {
    log(metric, values[metric]);
    if (metric === 'weight') refreshPlan();
    router.back();
  };

  return (
    <Screen footer={<Button label={t('common.save')} onPress={save} />}>
      <View style={s.header}>
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={() => router.back()} />
        <Segmented
          tone="light"
          accessibilityLabel={t('progress.title')}
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'weight', label: t('progress.weight') },
            { value: 'waist', label: t('progress.waist') },
          ]}
        />
      </View>
      <Text variant="title" accessibilityRole="header" style={s.title}>
        {t(metric === 'weight' ? 'logWeight.titleWeight' : 'logWeight.titleWaist')}
      </Text>
      <View style={s.center}>
        <Stepper
          variant="large"
          value={values[metric]}
          step={STEP[metric]}
          min={metric === 'weight' ? 60 : 15}
          max={metric === 'weight' ? 500 : 70}
          display={formatNumber(values[metric], language)}
          unit={unit}
          onChange={(v) => setValues((cur) => ({ ...cur, [metric]: v }))}
          decreaseLabel={t('result.less')}
          increaseLabel={t('result.more')}
        />
        {last && (
          <Text variant="label" tone="muted">
            {t('logWeight.last', {
              value: `${formatNumber(last.value, language)} ${unit}`,
              date: formatDayLabel(fromDayKey(last.day), language),
            })}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.space.md },
  title: { marginTop: theme.space.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.xl },
}));
