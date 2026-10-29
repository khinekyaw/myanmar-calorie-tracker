import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ASIAN_BMI_CUTOFFS, asianBmiCategory, bmi, type BmiCategory } from '@/domain/nutrition';
import { ftInToCm, lbToKg } from '@/domain/units';
import { formatNumber } from '@/lib/format';
import { useOnboarding } from '@/store/onboarding';
import { useLatest } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, Card, Text } from '@/ui';

const LABEL = {
  under: 'progress.bmiUnder',
  normal: 'progress.bmiNormal',
  over: 'progress.bmiOver',
  obese: 'progress.bmiObese',
} as const satisfies Record<BmiCategory, string>;

const SCALE = { min: 15, max: 32 };
const SEGMENTS: { cat: BmiCategory; from: number; to: number }[] = [
  { cat: 'under', from: SCALE.min, to: ASIAN_BMI_CUTOFFS.normal },
  { cat: 'normal', from: ASIAN_BMI_CUTOFFS.normal, to: ASIAN_BMI_CUTOFFS.over },
  { cat: 'over', from: ASIAN_BMI_CUTOFFS.over, to: ASIAN_BMI_CUTOFFS.obese },
  { cat: 'obese', from: ASIAN_BMI_CUTOFFS.obese, to: SCALE.max },
];
const pos = (v: number) => Math.min(Math.max((v - SCALE.min) / (SCALE.max - SCALE.min), 0), 1);

/** BMI with Asian cut-offs (18.5 / 23 / 27.5): value, category, scale with marker. */
export function BmiCard() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const heightFt = useOnboarding((st) => st.heightFt);
  const heightIn = useOnboarding((st) => st.heightIn);
  const weight = useLatest('weight');

  if (!heightFt || !weight) {
    return (
      <Card style={s.card}>
        <Text variant="headline">{t('progress.bmi')}</Text>
        <View style={s.missing}>
          <Text variant="body" tone="muted" style={s.flex}>
            {t('progress.bmiNeedsHeight')}
          </Text>
          <Button size="sm" label={t('progress.addHeight')} onPress={() => router.push('/health')} />
        </View>
      </Card>
    );
  }

  const value = bmi(lbToKg(weight.value), ftInToCm(Number(heightFt), Number(heightIn || 0)));
  const category = asianBmiCategory(value);

  return (
    <Card style={s.card}>
      <Text variant="headline">{t('progress.bmi')}</Text>
      <View style={s.valueRow}>
        <Text variant="numberLg">{formatNumber(Math.round(value * 10) / 10, language)}</Text>
        <View style={s.pill}>
          <View style={[s.dot, { backgroundColor: theme.colors.bmi[category] }]} />
          <Text variant="label">{t(LABEL[category])}</Text>
        </View>
      </View>
      <View>
        <View style={s.bar}>
          {SEGMENTS.map((seg) => (
            <View key={seg.cat} style={[s.seg, { flex: seg.to - seg.from, backgroundColor: theme.colors.bmi[seg.cat] }]} />
          ))}
          <View style={[s.marker, { left: `${pos(value) * 100}%` }]} />
        </View>
        <View style={s.ticks}>
          {[ASIAN_BMI_CUTOFFS.normal, ASIAN_BMI_CUTOFFS.over, ASIAN_BMI_CUTOFFS.obese].map((v) => (
            <Text key={v} variant="caption" tone="subtle" style={[s.tick, { left: `${pos(v) * 100}%` }]}>
              {formatNumber(v, language)}
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  flex: { flex: 1 },
  card: { gap: theme.space.md },
  missing: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.space.md,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bar: { flexDirection: 'row', height: 8, gap: 3 },
  seg: { borderRadius: 4 },
  marker: {
    position: 'absolute',
    top: -5,
    width: 6,
    height: 18,
    marginLeft: -3,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.background,
    backgroundColor: theme.colors.primary,
  },
  ticks: { height: 20, marginTop: theme.space.xs },
  tick: { position: 'absolute', width: 40, marginLeft: -20, textAlign: 'center' },
}));
