import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { weekDates } from '@/lib/dates';
import { tap } from '@/lib/haptics';
import { formatDayLabel, formatNumber } from '@/lib/format';
import { kcalOn, useLog } from '@/store/log';
import { usePlan } from '@/store/plan';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Card, Text } from '@/ui';

const BAR_H = 120;

/** This week's calories per day against the daily target. Tap a bar for its total. */
export function WeekCalories() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const entries = useLog((st) => st.entries);
  const target = usePlan((st) => st.plan.kcal);

  const today = new Date();
  const days = weekDates(today);
  const todayIndex = (today.getDay() + 6) % 7;
  const kcal = days.map((d, i) => (i > todayIndex ? null : Math.round(kcalOn(entries, d))));
  const [selected, setSelected] = useState(todayIndex);

  const logged = kcal.filter((k): k is number => k !== null && k > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0;
  const max = Math.max(target * 1.25, ...logged);
  const targetY = BAR_H - (target / max) * BAR_H;
  const labels = t('home.weekdays', { returnObjects: true }) as string[];
  const sel = kcal[selected];

  return (
    <Card style={s.card}>
      <View style={s.header}>
        <Text variant="headline">{t('progress.thisWeek')}</Text>
        <Text variant="label" tone="muted">
          {t('progress.avgKcal', { value: formatNumber(avg, language) })}
        </Text>
      </View>
      <View style={s.selRow}>
        <Text variant="numberLg">{sel === null ? '–' : formatNumber(sel, language)}</Text>
        <Text variant="label" tone="muted">
          {t('common.kcal')} · {formatDayLabel(days[selected], language)}
        </Text>
      </View>

      <View style={s.chart}>
        <View style={[s.targetLine, { top: targetY }]} />
        <Text variant="caption" tone="muted" style={[s.targetLabel, { top: targetY - 20 }]}>
          {t('progress.target', { value: formatNumber(target, language) })}
        </Text>
        {kcal.map((k, i) => (
          <Pressable
            key={i}
            disabled={k === null}
            accessibilityRole="button"
            accessibilityLabel={`${formatDayLabel(days[i], language)} ${k ?? 0} ${t('common.kcal')}`}
            accessibilityState={{ selected: i === selected }}
            onPress={() => {
              tap();
              setSelected(i);
            }}
            style={s.slot}>
            <View style={s.barArea}>
              {k !== null && k > 0 && (
                <View
                  style={[s.bar, { height: Math.max((k / max) * BAR_H, 6) }, i === selected ? s.barSelected : s.barIdle]}
                />
              )}
            </View>
            <Text variant="caption" tone={i === selected ? 'default' : 'subtle'}>
              {labels[i]}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  card: { gap: theme.space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.space.sm },
  chart: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: theme.space.lg },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: theme.space.lg,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.textSubtle,
  },
  targetLabel: { position: 'absolute', right: 0, marginTop: theme.space.lg },
  slot: { flex: 1, alignItems: 'center', gap: theme.space.xs, minHeight: theme.size.minTouch },
  barArea: { height: BAR_H, justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: 9 },
  barIdle: { backgroundColor: theme.colors.iconMuted },
  barSelected: { backgroundColor: theme.colors.primary },
}));
