import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { shiftDay } from '@/lib/dates';
import { formatDayLabel, formatMonthYear, formatNumber } from '@/lib/format';
import { refreshPlan } from '@/store/plan';
import { dayKey, fromDayKey, useLatest, useWeights } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, DatePickerSheet, Icon, IconButton, MeasureInput, Screen, Text } from '@/ui';

const RANGE: [number, number] = [60, 400];
const DEFAULT_LB = 140;
/** How far back a weight can be logged. */
const MAX_DAYS_BACK = 365;

/**
 * Log a weight for today or an earlier day, picked on a month calendar (no
 * future days). A day that already has a weight starts from it, so this
 * also corrects one; days with a weight are dotted on the calendar. Waist tracking is hidden for now (2026-10-31); the data
 * layer still stores it (`useWeights().log('waist', …)`).
 */
export function LogWeightScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const log = useWeights((st) => st.log);
  const entries = useWeights((st) => st.entries);
  const last = useLatest('weight');
  const today = dayKey(new Date());
  const savedOn = (d: string) => entries.find((e) => e.day === d)?.weightLb;

  const [day, setDay] = useState(today);
  const [value, setValue] = useState(savedOn(today) ?? last?.value ?? DEFAULT_LB);
  const unit = t('common.lb');

  const isToday = day === today;
  const oldest = shiftDay(today, -MAX_DAYS_BACK);
  const dayLabel = isToday
    ? t('home.today')
    : day === shiftDay(today, -1)
      ? t('logWeight.yesterday')
      : formatDayLabel(fromDayKey(day), language);

  const [picking, setPicking] = useState(false);
  const logged = useMemo(() => new Set(entries.filter((e) => e.weightLb !== undefined).map((e) => e.day)), [entries]);

  const pickDay = (next: string) => {
    setDay(next);
    const saved = savedOn(next);
    if (saved !== undefined) setValue(saved);
  };

  const save = () => {
    log('weight', value, day);
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${dayLabel}, ${t('logWeight.pickDay')}`}
          onPress={() => setPicking(true)}
          style={({ pressed }) => [s.dateButton, pressed && s.pressed]}>
          <Icon name="calendar" size={18} />
          <Text variant="bodyStrong" hugged>
            {dayLabel}
          </Text>
        </Pressable>
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
      <DatePickerSheet
        visible={picking}
        value={day}
        min={oldest}
        max={today}
        marked={logged}
        weekdayLabels={t('home.weekdays', { returnObjects: true }) as string[]}
        formatMonth={(d) => formatMonthYear(d, language)}
        formatDay={(d) => formatDayLabel(d, language)}
        previousLabel={t('logWeight.earlierMonth')}
        nextLabel={t('logWeight.laterMonth')}
        closeLabel={t('common.close')}
        onChange={pickDay}
        onClose={() => setPicking(false)}
      />
    </Screen>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.space.md },
  title: { marginTop: theme.space.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.xl },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    minHeight: 44,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  pressed: { backgroundColor: theme.colors.surfaceStrong },
}));
