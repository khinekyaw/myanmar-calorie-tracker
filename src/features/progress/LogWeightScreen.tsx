import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDayLabel, formatNumber } from '@/lib/format';
import { refreshPlan } from '@/store/plan';
import { fromDayKey, useLatest, useWeights } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, IconButton, MeasureInput, Screen, Text } from '@/ui';

const RANGE: [number, number] = [60, 400];
const DEFAULT_LB = 140;

/**
 * Log today's weight. Waist tracking is hidden for now (2026-10-31); the data
 * layer still stores it (`useWeights().log('waist', …)`).
 */
export function LogWeightScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const log = useWeights((st) => st.log);
  const last = useLatest('weight');
  const [value, setValue] = useState(last?.value ?? DEFAULT_LB);
  const unit = t('common.lb');

  const save = () => {
    log('weight', value);
    refreshPlan();
    router.back();
  };

  return (
    <Screen footer={<Button label={t('common.save')} onPress={save} />}>
      <View style={s.header}>
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={() => router.back()} />
      </View>
      <Text variant="title" accessibilityRole="header" style={s.title}>
        {t('logWeight.titleWeight')}
      </Text>
      <View style={s.center}>
        <MeasureInput
          value={value}
          min={RANGE[0]}
          max={RANGE[1]}
          unit={unit}
          scale="lb"
          onChange={setValue}
          accessibilityLabel={t('progress.weight')}
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
