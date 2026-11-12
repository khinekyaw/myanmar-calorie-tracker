import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HEALTH_LIMITS } from '@/config/health';
import { mealHealth, type HealthFlags } from '@/domain/health';
import { itemName, type MealItem, type Sweetness } from '@/domain/meal';
import { formatNumber } from '@/lib/format';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Chip, Text } from '@/ui';

type Props = {
  items: MealItem[];
  /** Guidance to show (Premium, and the user answered it). */
  on: HealthFlags;
  /** Make the item at `index` a lighter sweetness. */
  onSwap: (index: number, to: Sweetness) => void;
};

/**
 * Blood sugar / pressure lines for one meal (Premium): its sugar and sodium,
 * flagged when sugar-heavy or salty, with a lighter tea sweetness to switch
 * to. Draft dish numbers and PLACEHOLDER thresholds (config/health.ts).
 */
export function MealHealthNotes({ items, on, onSwap }: Props) {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const eaten = items.filter((i) => i.qty > 0);
  if ((!on.bloodSugar && !on.bloodPressure) || eaten.length === 0) return null;

  const h = mealHealth(items);
  const many = eaten.length > 1;
  const n = (v: number) => formatNumber(Math.round(v), language);
  const percent = Math.round((h.sodiumMg / HEALTH_LIMITS.sodiumBudgetMg) * 100);

  return (
    <View style={s.card}>
      {on.bloodSugar && (
        <View style={s.line}>
          <View style={[s.dot, { backgroundColor: theme.colors.nutrient.sugar }]} />
          <View style={s.flex}>
            {h.sugarHeavy && <Text variant="bodyStrong">{t('result.sugarHeavy')}</Text>}
            <Text variant={h.sugarHeavy ? 'caption' : 'body'} tone={h.sugarHeavy ? 'muted' : 'default'}>
              {t('result.sugar', { value: n(h.sugarG) })}
            </Text>
            {h.sugarHeavy && many && (
              <Text variant="caption" tone="muted">
                {t('result.mostFrom', { name: itemName(items[h.sweetest], language) })}
              </Text>
            )}
            {h.swaps.length > 0 && (
              <View style={s.swaps}>
                {h.swaps.map(({ index, to }) => {
                  const level = t(`search.${to}`);
                  return (
                    <Chip
                      key={index}
                      look="onSurface"
                      icon="check"
                      label={
                        many
                          ? `${itemName(items[index], language)} · ${t('result.swap', { level })}`
                          : t('result.swap', { level })
                      }
                      onPress={() => onSwap(index, to)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}
      {on.bloodPressure && (
        <View style={s.line}>
          <View style={[s.dot, { backgroundColor: theme.colors.nutrient.sodium }]} />
          <View style={s.flex}>
            {h.salty && <Text variant="bodyStrong">{t('result.salty')}</Text>}
            <Text variant={h.salty ? 'caption' : 'body'} tone={h.salty ? 'muted' : 'default'}>
              {t('result.sodium', { value: n(h.sodiumMg), percent: formatNumber(percent, language) })}
            </Text>
            {h.salty && many && (
              <Text variant="caption" tone="muted">
                {t('result.mostFrom', { name: itemName(items[h.saltiest], language) })}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  flex: { flex: 1, gap: 2 },
  card: {
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md },
  // Lines up with the first line of text.
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  swaps: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm, marginTop: theme.space.sm },
}));
