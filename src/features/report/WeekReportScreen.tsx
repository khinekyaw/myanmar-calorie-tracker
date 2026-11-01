import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { shiftDay } from '@/lib/dates';
import { formatDayRange, formatFixed, formatNumber, formatPlates } from '@/lib/format';
import { tap } from '@/lib/haptics';
import { getDish, type DishId } from '@/data/dishes';
import { useIsPremium } from '@/store/premium';
import { fromDayKey } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, Card, Icon, IconButton, Logo, Text } from '@/ui';

import { NutrientCard } from '../home/components/NutrientCard';
import { BadgeArt } from '../milestones/BadgeArt';
import { useWeekRange, useWeekReport } from './useWeekReport';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Weekly report, Monday to Sunday. Opens on last week (the Monday
 * notification) or `?week=`; arrows step through older weeks. Everyone sees
 * days logged and average calories; Premium sees the rest.
 */
export function WeekReportScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const params = useLocalSearchParams<{ week?: string }>();
  const range = useWeekRange();
  const premium = useIsPremium();
  const clamp = (w: string) => (w < range.first ? range.first : w > range.last ? range.last : w);
  const [week, setWeek] = useState(() =>
    clamp(params.week && DATE_KEY.test(params.week) ? params.week : range.previous),
  );
  const { report, streak, earned, targets } = useWeekReport(week);
  const n = (v: number) => formatNumber(v, language);

  const step = (days: number) => {
    tap();
    setWeek(clamp(shiftDay(week, days)));
  };
  const dates = formatDayRange(fromDayKey(report.weekStart), fromDayKey(report.weekEnd), language);
  const which = week === range.last ? t('report.thisWeek') : week === range.previous ? t('report.lastWeek') : null;
  const change = report.weightChangeLb;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <IconButton
            icon="chevronLeft"
            accessibilityLabel={t('common.back')}
            // Opened from the notification there's nothing behind it: go Home instead.
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          />
        </View>
        <Text variant="title" accessibilityRole="header">
          {t('report.title')}
        </Text>

        <View style={s.weekRow}>
          <IconButton
            icon="chevronLeft"
            accessibilityLabel={t('report.prevWeek')}
            disabled={week <= range.first}
            style={week <= range.first && s.disabled}
            onPress={() => step(-7)}
          />
          <View style={s.weekLabel} accessible accessibilityLiveRegion="polite">
            <Text variant="bodyStrong" align="center">
              {dates}
            </Text>
            {/* Kept when empty so the row doesn't jump between weeks. */}
            <Text variant="caption" tone="muted" align="center" style={!which && s.hidden}>
              {which ?? ' '}
            </Text>
          </View>
          <IconButton
            icon="chevronRight"
            accessibilityLabel={t('report.nextWeek')}
            disabled={week >= range.last}
            style={week >= range.last && s.disabled}
            onPress={() => step(7)}
          />
        </View>

        <View style={s.pair}>
          <Card size="md" style={s.stat}>
            <Text variant="numberMd">{`${n(report.daysLogged)}/${n(7)}`}</Text>
            <Text variant="caption" tone="muted">
              {t('report.daysLogged')}
            </Text>
          </Card>
          <Card size="md" style={s.stat}>
            <Text variant="numberMd">{report.daysLogged ? n(report.avgKcal) : '–'}</Text>
            <Text variant="caption" tone="muted">
              {t('report.avgKcal')}
            </Text>
            <Text variant="caption" tone="subtle">
              {t('progress.target', { value: n(targets.kcal) })}
            </Text>
          </Card>
        </View>

        {premium ? (
          <>
            <View style={s.pair}>
              <Card size="md" style={s.stat}>
                <Text variant="numberMd">{n(report.onTargetDays)}</Text>
                <Text variant="caption" tone="muted">
                  {t('report.onTarget')}
                </Text>
              </Card>
              <Card size="md" style={s.stat}>
                <Text variant="numberMd">{n(report.overDays)}</Text>
                <Text variant="caption" tone="muted">
                  {t('report.over')}
                </Text>
              </Card>
            </View>

            <View style={s.pair}>
              <NutrientCard
                value={formatPlates(Math.round(report.avgRicePlates * 2) / 2, language)}
                label={t('report.avgRice')}
                progress={report.avgRicePlates / targets.ricePlates}
                color={theme.colors.nutrient.carbs}
                icon="rice"
              />
              <NutrientCard
                value={`${n(report.avgProteinG)}${t('common.g')}`}
                label={t('report.avgProtein')}
                progress={report.avgProteinG / targets.proteinG}
                color={theme.colors.nutrient.protein}
                icon="protein"
              />
              <NutrientCard
                value={`${n(report.avgFatG)}${t('common.g')}`}
                label={t('report.avgFat')}
                progress={report.avgFatG / targets.fatG}
                color={theme.colors.nutrient.fat}
                icon="oil"
              />
            </View>

            <View style={s.pair}>
              <Card size="md" style={s.stat}>
                <Text variant="numberMd">
                  {change === null
                    ? '–'
                    : `${change < 0 ? '↓ ' : change > 0 ? '↑ ' : ''}${formatFixed(Math.abs(change), language)} ${t('common.lb')}`}
                </Text>
                <Text variant="caption" tone="muted">
                  {change === null ? t('report.noWeighIn') : t('report.weight')}
                </Text>
              </Card>
              <Card size="md" style={s.stat}>
                <Text variant="numberMd">{n(streak)}</Text>
                <Text variant="caption" tone="muted">
                  {t('milestones.dayStreak')}
                </Text>
              </Card>
            </View>

            {earned.length > 0 && (
              <View style={s.section}>
                <Text variant="caption" tone="subtle" accessibilityRole="header">
                  {t('report.badges')}
                </Text>
                <View style={s.badges}>
                  {earned.map((b) => (
                    <View
                      key={b.id}
                      style={s.badge}
                      accessible
                      accessibilityLabel={t(`milestones.badge.${b.id}`)}>
                      <BadgeArt id={b.id} earned size={64} target={b.target} />
                      <Text variant="caption" align="center" numberOfLines={2}>
                        {t(`milestones.badge.${b.id}`)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {report.topDishes.length > 0 && (
              <View style={s.section}>
                <Text variant="caption" tone="subtle" accessibilityRole="header">
                  {t('report.topDishes')}
                </Text>
                <Card size="md" style={s.dishes}>
                  {report.topDishes.map((d, i) => (
                    <View key={d.dishId} style={s.dishRow}>
                      <Text variant="numberSm" tone="muted" style={s.rank}>
                        {n(i + 1)}
                      </Text>
                      <Text variant="body" style={s.flex} numberOfLines={1}>
                        {getDish(d.dishId as DishId).name[language]}
                      </Text>
                      <Text variant="label" tone="muted">
                        {t('report.meals', { count: d.count, value: n(d.count) })}
                      </Text>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            <Card size="md" style={s.tip}>
              <Icon name="sparkle" size={20} />
              <Text variant="bodyStrong" style={s.flex}>
                {t(`report.tip.${report.tip}`)}
              </Text>
            </Card>
          </>
        ) : (
          <View style={s.locked}>
            <View style={s.logo}>
              <Logo size={24} color={theme.colors.accent} />
            </View>
            <Text variant="bodyStrong" style={s.flex}>
              {t('report.premiumTitle')}
            </Text>
            <Button size="sm" label={t('report.premiumButton')} onPress={() => router.push('/paywall')} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.gutter, paddingBottom: theme.space.xxxl, gap: theme.space.sm + 2 },
  header: { flexDirection: 'row', paddingTop: theme.space.sm, marginBottom: theme.space.sm },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, marginVertical: theme.space.md },
  weekLabel: { flex: 1 },
  hidden: { opacity: 0 },
  disabled: { opacity: theme.opacity.disabled },
  pair: { flexDirection: 'row', gap: theme.space.sm },
  stat: { flex: 1, gap: theme.space.xs },
  section: { gap: theme.space.sm, paddingTop: theme.space.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.space.md },
  badge: { width: '33.333%', alignItems: 'center', gap: theme.space.xs, paddingHorizontal: theme.space.xs },
  dishes: { gap: theme.space.md },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  rank: { width: 16 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, marginTop: theme.space.md },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    padding: theme.space.lg,
    marginTop: theme.space.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.accentSoft,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
