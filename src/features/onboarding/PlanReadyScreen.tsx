import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatNumber, formatPlates } from '@/lib/format';
import { usePlan } from '@/store/plan';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, Icon, Screen, Text } from '@/ui';

/** The computed plan: kcal, plates of rice, protein, fat, and the gradual rice cut. */
export function PlanReadyScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const plan = usePlan((st) => st.plan);

  return (
    <Screen footer={<Button label={t('planReady.start')} onPress={() => router.push('/sign-in')} />}>
      <View style={s.top}>
        <View style={s.check}>
          <Icon name="check" size={24} strokeWidth={2.6} color={theme.colors.onPrimary} />
        </View>
        <Text variant="title" align="center" accessibilityRole="header">
          {t('planReady.title')}
        </Text>
      </View>

      <View style={s.grid}>
        <View style={s.row}>
          <Tile label={t('planReady.kcal')} value={formatNumber(plan.kcal, language)} />
          <Tile
            label={t('planReady.rice')}
            value={formatPlates(plan.ricePlates, language)}
            unit={t('planReady.plates')}
            icon="rice"
            color={theme.colors.nutrient.carbs}
          />
        </View>
        <View style={s.row}>
          <Tile
            label={t('planReady.protein')}
            value={formatNumber(plan.proteinG, language)}
            unit={t('common.g')}
            dot={theme.colors.nutrient.protein}
          />
          <Tile label={t('planReady.fat')} value={formatNumber(plan.fatG, language)} unit={t('common.g')} dot={theme.colors.nutrient.fat} />
        </View>
      </View>

      {plan.riceSteps.length > 1 && (
        <View style={s.steps}>
          <Text variant="callout" tone="muted">
            {t('planReady.riceSteps')}
          </Text>
          <Text variant="numberSm">{plan.riceSteps.map((p) => formatPlates(p, language)).join(' → ')}</Text>
        </View>
      )}
    </Screen>
  );
}

type TileProps = { label: string; value: string; unit?: string; icon?: 'rice'; color?: string; dot?: string };

function Tile({ label, value, unit, icon, color, dot }: TileProps) {
  const s = useStyles();
  return (
    <View style={s.tile} accessible accessibilityLabel={`${label} ${value} ${unit ?? ''}`}>
      <View style={s.tileLabel}>
        {icon && <Icon name={icon} size={16} strokeWidth={2} color={color} />}
        {dot && <View style={[s.dot, { backgroundColor: dot }]} />}
        <Text variant="label" tone="muted">
          {label}
        </Text>
      </View>
      <View style={s.tileValue}>
        <Text variant="numberLg" style={s.number}>
          {value}
        </Text>
        {unit && (
          <Text variant="label" tone="muted">
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  top: { alignItems: 'center', gap: theme.space.md, paddingTop: theme.space.xxxl + theme.space.lg },
  check: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { gap: theme.space.sm + 2, marginTop: theme.space.xxxl },
  row: { flexDirection: 'row', gap: theme.space.sm + 2 },
  tile: { flex: 1, gap: theme.space.md, padding: theme.space.lg + 2, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  tileLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tileValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  number: { fontSize: 30 },
  steps: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.space.sm, marginTop: theme.space.xxl },
}));
