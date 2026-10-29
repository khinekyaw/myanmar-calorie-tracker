import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ASIAN_BMI_CUTOFFS, asianBmiCategory, bmi, type BmiCategory } from '@/domain/nutrition';
import { lbToKg } from '@/domain/units';
import { formatNumber } from '@/lib/format';
import { mockHeightCm, mockStreakDays, weeklyWaistIn, weeklyWeightLb } from '@/mocks/progress';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Card, Icon, Segmented, Text } from '@/ui';

import { LineChart } from './components/LineChart';

type Metric = 'weight' | 'waist';

const BMI_LABEL = {
  under: 'progress.bmiUnder',
  normal: 'progress.bmiNormal',
  over: 'progress.bmiOver',
  obese: 'progress.bmiObese',
} as const satisfies Record<BmiCategory, string>;

/** Scale shown under the BMI value (Asian cut-offs). */
const BMI_SCALE = { min: 15, max: 32 };

export function ProgressScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const [metric, setMetric] = useState<Metric>('weight');

  const values = metric === 'weight' ? weeklyWeightLb : weeklyWaistIn;
  const unit = metric === 'weight' ? t('common.lb') : '″';
  const current = values[values.length - 1];
  const delta = current - values[0];

  const bmiValue = bmi(lbToKg(weeklyWeightLb[weeklyWeightLb.length - 1]), mockHeightCm);
  const category = asianBmiCategory(bmiValue);
  const marker = (bmiValue - BMI_SCALE.min) / (BMI_SCALE.max - BMI_SCALE.min);
  const segment = (from: number, to: number) => (to - from) / (BMI_SCALE.max - BMI_SCALE.min);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text variant="title" accessibilityRole="header" style={s.title}>
          {t('progress.title')}
        </Text>

        <Card style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text variant="numberLg">
              {formatNumber(current, language)}
              <Text variant="label" tone="muted">
                {' '}
                {unit}
              </Text>
            </Text>
            <Segmented
              accessibilityLabel={t('progress.title')}
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'weight', label: t('progress.weight') },
                { value: 'waist', label: t('progress.waist') },
              ]}
            />
          </View>
          <LineChart values={values} accessibilityLabel={`${t(`progress.${metric}`)} ${formatNumber(values[0], language)} → ${formatNumber(current, language)} ${unit}`} />
          <Text variant="caption" tone="muted">
            {t('progress.trend', {
              value: `${delta <= 0 ? '↓' : '↑'} ${formatNumber(Math.abs(delta), language)} ${unit}`,
              weeks: formatNumber(values.length, language),
            })}
          </Text>
        </Card>

        <View style={s.stats}>
          <Card style={s.stat}>
            <Icon name="flame" size={22} strokeWidth={2} />
            <Text variant="numberLg">{formatNumber(mockStreakDays, language)}</Text>
            <Text variant="caption" tone="muted">
              {t('progress.streak')}
            </Text>
          </Card>

          <Card style={s.stat}>
            <Text variant="label">{t('progress.bmi')}</Text>
            <Text variant="numberLg">{formatNumber(Math.round(bmiValue * 10) / 10, language)}</Text>
            <View style={s.bmiLabelRow}>
              <View style={[s.bmiDot, { backgroundColor: theme.colors.bmi[category] }]} />
              <Text variant="caption" style={s.bmiLabel}>
                {t(BMI_LABEL[category])}
              </Text>
            </View>
            <View style={s.bmiBar}>
              <View style={[s.bmiSeg, { flex: segment(BMI_SCALE.min, ASIAN_BMI_CUTOFFS.normal), backgroundColor: theme.colors.bmi.under }]} />
              <View style={[s.bmiSeg, { flex: segment(ASIAN_BMI_CUTOFFS.normal, ASIAN_BMI_CUTOFFS.over), backgroundColor: theme.colors.bmi.normal }]} />
              <View style={[s.bmiSeg, { flex: segment(ASIAN_BMI_CUTOFFS.over, ASIAN_BMI_CUTOFFS.obese), backgroundColor: theme.colors.bmi.over }]} />
              <View style={[s.bmiSeg, { flex: segment(ASIAN_BMI_CUTOFFS.obese, BMI_SCALE.max), backgroundColor: theme.colors.bmi.obese }]} />
              <View style={[s.bmiMarker, { left: `${Math.min(Math.max(marker, 0), 1) * 100}%` }]} />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ theme, type }) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.space.lg, paddingBottom: theme.size.fab + theme.space.xxl },
  title: { marginTop: theme.space.lg },
  chartCard: { marginTop: theme.space.lg, gap: theme.space.lg },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space.md },
  stats: { flexDirection: 'row', gap: theme.space.sm + 2, marginTop: theme.space.sm + 2 },
  stat: { flex: 1, gap: theme.space.sm },
  bmiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -theme.space.xs },
  bmiDot: { width: 8, height: 8, borderRadius: 4 },
  bmiLabel: { fontFamily: type.bodyStrong.fontFamily },
  bmiBar: { flexDirection: 'row', height: 5, gap: 2, marginTop: theme.space.xs },
  bmiSeg: { borderRadius: 3 },
  bmiMarker: {
    position: 'absolute',
    top: -5,
    width: 4,
    height: 15,
    marginLeft: -2,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.background,
  },
}));
