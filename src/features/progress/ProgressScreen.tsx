import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { goalProgress } from '@/domain/progress';
import { formatDayLabel, formatNumber, formatShortDate } from '@/lib/format';
import { useOnboarding } from '@/store/onboarding';
import { fromDayKey, series, useWeights, type Metric } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, Card, Segmented, Text } from '@/ui';

import { StreakPill } from '../milestones/StreakPill';
import { BmiCard } from './components/BmiCard';
import { LineChart } from './components/LineChart';
import { WeekCalories } from './components/WeekCalories';

type Period = '1m' | '3m' | 'all';
const PERIOD_DAYS: Record<Period, number> = { '1m': 31, '3m': 92, all: Infinity };

/**
 * Goal and current weight with their actions, goal progress chart
 * (weight or waist), this week's calories, and BMI.
 */
export function ProgressScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const [metric, setMetric] = useState<Metric>('weight');
  const [period, setPeriod] = useState<Period>('3m');
  const entries = useWeights((st) => st.entries);
  const goal = useOnboarding((st) => st.goal);
  const target = useOnboarding((st) => st.targetWeightLb);

  const all = series(entries, metric).map((p) => ({ date: fromDayKey(p.day), value: p.value }));
  // Period counts back from the latest entry (keeps render pure; no Date.now()).
  const cutoff = (all.at(-1)?.date.getTime() ?? 0) - PERIOD_DAYS[period] * 24 * 3600 * 1000;
  const points = all.filter((p) => p.date.getTime() >= cutoff);
  const weights = series(entries, 'weight');
  const current = weights.at(-1);
  const unit = metric === 'weight' ? t('common.lb') : t('common.inch');
  const fmt = (v: number) => formatNumber(Math.round(v * 10) / 10, language);

  const start = weights[0]?.value;
  const progress =
    current && start !== undefined && target !== null ? goalProgress(goal, start, current.value, target) : null;
  const delta = points.length > 1 ? points[points.length - 1].value - points[0].value : 0;
  const goalText =
    goal === 'maintain' ? t('goal.maintain') : target === null ? t('progress.noGoal') : `${fmt(target)} ${t('common.lb')}`;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.titleRow}>
          <Text variant="title" accessibilityRole="header">
            {t('progress.title')}
          </Text>
          <StreakPill />
        </View>

        <Card size="md" style={s.row}>
          <View style={s.flex}>
            <Text variant="numberMd">{goalText}</Text>
            <Text variant="caption" tone="muted">
              {t('progress.goalWeight')}
            </Text>
          </View>
          <Button size="sm" label={t('progress.editGoal')} onPress={() => router.push('/edit-goal')} />
        </Card>

        <Card size="md" style={s.row}>
          <View style={s.flex}>
            <Text variant="numberMd">{current ? `${fmt(current.value)} ${t('common.lb')}` : '–'}</Text>
            <Text variant="caption" tone="muted">
              {current
                ? t('progress.currentOn', { date: formatDayLabel(fromDayKey(current.day), language) })
                : t('progress.currentWeight')}
            </Text>
          </View>
          <Button
            size="sm"
            label={t('progress.logWeight')}
            onPress={() => router.push({ pathname: '/log-weight', params: { metric } })}
          />
        </Card>

        <Card style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text variant="headline" style={s.flex}>
              {t(metric === 'weight' ? 'progress.goalProgress' : 'progress.waist')}
            </Text>
            <Segmented
              accessibilityLabel={t('progress.period')}
              value={period}
              onChange={setPeriod}
              options={[
                { value: '1m', label: t('progress.period1m') },
                { value: '3m', label: t('progress.period3m') },
                { value: 'all', label: t('progress.periodAll') },
              ]}
            />
          </View>

          <View style={s.summary}>
            {metric === 'weight' && progress !== null ? (
              <>
                <Text variant="numberLg">{formatNumber(Math.round(progress * 100), language)}%</Text>
                <Text variant="label" tone="muted" style={s.flex}>
                  {progress >= 1
                    ? t('progress.reached')
                    : t('progress.toGo', { value: `${fmt(Math.abs((current?.value ?? 0) - (target ?? 0)))} ${unit}` })}
                </Text>
              </>
            ) : (
              <>
                <Text variant="numberLg">{points.length ? fmt(points[points.length - 1].value) : '–'}</Text>
                <Text variant="label" tone="muted" style={s.flex}>
                  {unit}
                </Text>
              </>
            )}
          </View>

          {points.length > 0 ? (
            <LineChart
              // New data or range → start again on the latest point.
              key={`${metric}-${period}-${points.length}-${points.at(-1)?.value}`}
              points={points}
              goal={metric === 'weight' && goal !== 'maintain' && target !== null ? target : undefined}
              goalLabel={t('progress.goalLine')}
              formatValue={fmt}
              formatDate={(d) => formatShortDate(d, language)}
              accessibilityLabel={`${t(`progress.${metric}`)} ${fmt(points[0].value)} → ${fmt(points[points.length - 1].value)} ${unit}`}
            />
          ) : (
            <View style={s.empty}>
              <Text variant="body" tone="muted" align="center">
                {t('progress.noData')}
              </Text>
            </View>
          )}

          <View style={s.chartFooter}>
            <Segmented
              accessibilityLabel={t('progress.title')}
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'weight', label: t('progress.weight') },
                { value: 'waist', label: t('progress.waist') },
              ]}
            />
            {points.length > 1 && (
              <Text variant="caption" tone="muted">
                {`${delta <= 0 ? '↓' : '↑'} ${fmt(Math.abs(delta))} ${unit}`}
              </Text>
            )}
          </View>
        </Card>

        <WeekCalories />
        <BmiCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.gutter, paddingBottom: theme.size.fab + theme.space.xxl, gap: theme.space.sm + 2 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.lg,
    marginBottom: theme.space.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  chartCard: { gap: theme.space.md },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: theme.space.sm },
  empty: { height: 160, justifyContent: 'center' },
  chartFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));
