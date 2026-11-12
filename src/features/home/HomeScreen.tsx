import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { HEALTH_LIMITS } from '@/config/health';
import { isSugarHeavy } from '@/domain/health';
import { sumMacros } from '@/domain/meal';
import { weekStart } from '@/lib/dates';
import { formatDayLabel, formatNumber, formatPlates } from '@/lib/format';
import { useConnectivity } from '@/lib/network';
import { useHealthGuidance } from '@/store/health';
import { useDaySummary, useLog } from '@/store/log';
import { usePlan } from '@/store/plan';
import { dayKey } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Card, Icon, Logo, Ring, Text } from '@/ui';

import { StreakPill } from '../milestones/StreakPill';
import { PremiumUpsell } from '../premium/PremiumUpsell';
import { MealRow } from './components/MealRow';
import { NutrientCard } from './components/NutrientCard';
import { WeekStrip } from './components/WeekStrip';

export function HomeScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const day = useDaySummary(selectedDay);
  const allEntries = useLog((st) => st.entries);
  const targetKcal = usePlan((st) => st.plan.kcal);
  // kcal eaten per day, for the rings on the week strip.
  const kcalByDay = new Map<string, number>();
  for (const e of allEntries) {
    if (e.status !== 'done') continue;
    const key = dayKey(e.eatenAt);
    kcalByDay.set(key, (kcalByDay.get(key) ?? 0) + sumMacros(e.items).kcal);
  }
  const isToday = dayKey(selectedDay) === dayKey(new Date());
  const health = useHealthGuidance();
  // Blood sugar: sugary meals in the selected day's week (Monday to Sunday).
  const monday = weekStart(dayKey(selectedDay));
  const sugaryMeals = allEntries.filter((e) => {
    const key = dayKey(e.eatenAt);
    return e.status === 'done' && key >= monday && key <= dayKey(selectedDay) && isSugarHeavy(e.items);
  }).length;
  const riceOver = health.on.bloodSugar && day.ricePlatesOver > 0;
  const sodiumLeft = Math.max(Math.round(HEALTH_LIMITS.sodiumBudgetMg - day.sodiumMg), 0);
  const sodiumOver = Math.max(Math.round(day.sodiumMg - HEALTH_LIMITS.sodiumBudgetMg), 0);
  const bothHealth = health.on.bloodSugar && health.on.bloodPressure;
  const { online } = useConnectivity();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.brand}>
            <Logo size={24} />
            <Text variant="wordmark">Sar AI</Text>
          </View>
          <View style={s.headerRight}>
            {!online && (
              <View style={s.offline} accessibilityRole="text" accessibilityLiveRegion="polite">
                <Icon name="cloudOff" size={15} strokeWidth={2} color={theme.colors.onPrimary} />
                <Text variant="caption" tone="inverse">
                  {t('queue.offline')}
                </Text>
              </View>
            )}
            <StreakPill />
          </View>
        </View>

        <WeekStrip selected={selectedDay} onSelect={setSelectedDay} kcalByDay={kcalByDay} targetKcal={targetKcal} />

        <Card style={s.kcalCard}>
          <View style={s.kcalText}>
            <Text variant="numberXl">{formatNumber(day.kcalOver || day.kcalLeft, language)}</Text>
            <Text variant="label" tone="muted">
              {t(day.kcalOver ? 'home.caloriesOver' : 'home.caloriesLeft')}
            </Text>
          </View>
          <Ring progress={day.kcalProgress} size={92} stroke={8}>
            <Icon name="flame" size={26} strokeWidth={2} />
          </Ring>
        </Card>

        <View style={s.nutrients}>
          <NutrientCard
            value={formatPlates(riceOver ? day.ricePlatesOver : day.ricePlatesLeft, language)}
            label={t(riceOver ? 'home.riceOver' : 'home.rice')}
            progress={day.riceProgress}
            color={theme.colors.nutrient.carbs}
            icon="rice"
            over={riceOver}
          />
          <NutrientCard
            value={`${formatNumber(day.proteinLeft, language)}${t('common.g')}`}
            label={t('home.protein')}
            progress={day.proteinProgress}
            color={theme.colors.nutrient.protein}
            icon="protein"
          />
          <NutrientCard
            value={`${formatNumber(day.fatLeft, language)}${t('common.g')}`}
            label={t('home.fat')}
            progress={day.fatProgress}
            color={theme.colors.nutrient.fat}
            icon="oil"
          />
        </View>

        {(health.on.bloodSugar || health.on.bloodPressure) && (
          <View style={s.nutrients}>
            {health.on.bloodSugar && (
              <NutrientCard
                value={formatNumber(sugaryMeals, language)}
                label={t('home.sugarHeavy')}
                progress={sugaryMeals / HEALTH_LIMITS.sugarHeavyMealsPerWeek}
                color={theme.colors.nutrient.sugar}
                icon="sugar"
                over={sugaryMeals > HEALTH_LIMITS.sugarHeavyMealsPerWeek}
                wide={!bothHealth}
              />
            )}
            {health.on.bloodPressure && (
              <NutrientCard
                value={`${formatNumber(sodiumOver || sodiumLeft, language)}${t('common.mg')}`}
                label={t(sodiumOver ? 'home.sodiumOver' : 'home.sodium')}
                progress={day.sodiumMg / HEALTH_LIMITS.sodiumBudgetMg}
                color={theme.colors.nutrient.sodium}
                icon="salt"
                over={sodiumOver > 0}
                wide={!bothHealth}
              />
            )}
          </View>
        )}
        {health.locked && (
          <View style={s.upsell}>
            <PremiumUpsell title={t('home.healthUpsell')} />
          </View>
        )}

        <Text variant="headline" accessibilityRole="header" style={s.sectionTitle}>
          {isToday ? t('home.today') : formatDayLabel(selectedDay, language)}
        </Text>
        <View style={s.meals}>
          {day.entries.map((e) => (
            <MealRow key={e.id} entry={e} />
          ))}
          {day.entries.length === 0 && (
            <View style={s.empty}>
              <Text variant="body" tone="muted" align="center">
                {t('home.empty')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.gutter, paddingBottom: theme.size.fab + theme.space.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.space.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  kcalCard: {
    marginTop: theme.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space.xxl,
  },
  kcalText: { gap: theme.space.xs, flexShrink: 1 },
  nutrients: { flexDirection: 'row', gap: theme.space.sm, marginTop: theme.space.sm },
  upsell: { marginTop: theme.space.sm },
  sectionTitle: { marginTop: theme.space.xxl, marginBottom: theme.space.md },
  meals: { gap: theme.space.sm },
  empty: { paddingVertical: theme.space.xxl, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
}));
