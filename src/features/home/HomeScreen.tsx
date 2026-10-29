import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { formatNumber, formatPlates } from '@/lib/format';
import { useConnectivity } from '@/lib/network';
import { mockStreakDays } from '@/mocks/progress';
import { useDaySummary } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Card, Icon, Logo, Ring, Text } from '@/ui';

import { MealRow } from './components/MealRow';
import { NutrientCard } from './components/NutrientCard';
import { WeekStrip } from './components/WeekStrip';

export function HomeScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const day = useDaySummary();
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
            <View style={s.streak} accessible accessibilityLabel={t('home.streak', { count: mockStreakDays })}>
              <Icon name="flame" size={16} strokeWidth={2} />
              <Text variant="numberSm">{formatNumber(mockStreakDays, language)}</Text>
            </View>
          </View>
        </View>

        <WeekStrip />

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
            value={formatPlates(day.ricePlatesLeft, language)}
            label={t('home.rice')}
            progress={day.riceProgress}
            color={theme.colors.nutrient.carbs}
            icon="rice"
          />
          <NutrientCard
            value={`${formatNumber(day.proteinLeft, language)}${t('common.g')}`}
            label={t('home.protein')}
            progress={day.proteinProgress}
            color={theme.colors.nutrient.protein}
            icon="fish"
          />
          <NutrientCard
            value={`${formatNumber(day.fatLeft, language)}${t('common.g')}`}
            label={t('home.fat')}
            progress={day.fatProgress}
            color={theme.colors.nutrient.fat}
            icon="oil"
          />
        </View>

        <Text variant="headline" accessibilityRole="header" style={s.sectionTitle}>
          {t('home.today')}
        </Text>
        <View style={s.meals}>
          {day.entries.map((e) => (
            <MealRow key={e.id} entry={e} />
          ))}
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
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    height: 36,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
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
  sectionTitle: { marginTop: theme.space.xxl, marginBottom: theme.space.md },
  meals: { gap: theme.space.sm },
}));
