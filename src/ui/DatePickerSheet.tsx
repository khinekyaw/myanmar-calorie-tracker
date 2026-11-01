import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { dayKey, fromDayKey, monthGrid } from '@/lib/dates';
import { makeStyles } from '@/theme/ThemeProvider';

import { BottomSheet } from './BottomSheet';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  visible: boolean;
  /** Selected day (YYYY-MM-DD). */
  value: string;
  /** First and last days that can be picked; others show faded. */
  min?: string;
  max?: string;
  /** Days that already have an entry get a small dot. */
  marked?: ReadonlySet<string>;
  /** Monday first, e.g. t('home.weekdays'). */
  weekdayLabels: string[];
  /** "November 2026" / "နိုဝင်ဘာ 2026". */
  formatMonth: (date: Date) => string;
  /** Spoken label for a day, e.g. formatDayLabel. */
  formatDay: (date: Date) => string;
  previousLabel: string;
  nextLabel: string;
  closeLabel: string;
  onChange: (day: string) => void;
  onClose: () => void;
};

/**
 * Month calendar in a bottom sheet: ‹ month › and a Monday-first grid.
 * Tapping a day picks it and closes the sheet. Selected = solid ink circle,
 * today = bold, days with an entry = a dot.
 */
export function DatePickerSheet(props: Props) {
  const s = useStyles();
  // A new calendar each time the sheet opens, so it starts on the selected month.
  const [opens, setOpens] = useState(0);
  const [wasVisible, setWasVisible] = useState(props.visible);
  if (props.visible !== wasVisible) {
    setWasVisible(props.visible);
    if (props.visible) setOpens(opens + 1);
  }
  return (
    <BottomSheet visible={props.visible} onClose={props.onClose} closeLabel={props.closeLabel} contentStyle={s.content}>
      <Calendar key={opens} {...props} />
    </BottomSheet>
  );
}

function Calendar({
  value,
  min,
  max,
  marked,
  weekdayLabels,
  formatMonth,
  formatDay,
  previousLabel,
  nextLabel,
  onChange,
  onClose,
}: Props) {
  const s = useStyles();
  const [shown, setShown] = useState(() => monthOf(value));

  const today = dayKey(new Date());
  const firstOfShown = dayKey(new Date(shown.year, shown.month, 1));
  const lastOfShown = dayKey(new Date(shown.year, shown.month + 1, 0));
  const canGoBack = !min || firstOfShown > min;
  const canGoForward = !max || lastOfShown < max;
  const move = (n: number) => setShown(({ year, month }) => monthOf(dayKey(new Date(year, month + n, 1))));

  return (
    <>
      <View style={s.header}>
        <IconButton
          icon="chevronLeft"
          accessibilityLabel={previousLabel}
          disabled={!canGoBack}
          onPress={() => move(-1)}
          style={!canGoBack && s.off}
        />
        <Text variant="headline" align="center" accessibilityRole="header" accessibilityLiveRegion="polite" style={s.month}>
          {formatMonth(new Date(shown.year, shown.month, 1))}
        </Text>
        <IconButton
          icon="chevronRight"
          accessibilityLabel={nextLabel}
          disabled={!canGoForward}
          onPress={() => move(1)}
          style={!canGoForward && s.off}
        />
      </View>

      <View style={s.row}>
        {weekdayLabels.map((label, i) => (
          <Text key={i} variant="caption" tone="subtle" align="center" style={s.cell}>
            {label}
          </Text>
        ))}
      </View>

      {sixWeeks(monthGrid(shown.year, shown.month)).map((week, r) => (
        <View key={r} style={s.row}>
          {week.map((day, c) => {
            if (!day) return <View key={c} style={s.cell} />;
            const selected = day === value;
            const allowed = (!min || day >= min) && (!max || day <= max);
            const hasEntry = marked?.has(day);
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !allowed }}
                accessibilityLabel={formatDay(fromDayKey(day))}
                disabled={!allowed}
                onPress={() => {
                  onChange(day);
                  onClose();
                }}
                style={s.cell}>
                {({ pressed }) => (
                  <View style={[s.day, selected ? s.selected : s.idle, pressed && !selected && s.pressed]}>
                    <Text
                      variant={day === today || selected ? 'bodyStrong' : 'body'}
                      tone={selected ? 'inverse' : allowed ? 'default' : 'subtle'}>
                      {fromDayKey(day).getDate()}
                    </Text>
                    <View style={[s.dot, hasEntry && (selected ? s.dotOnInk : s.dotOn)]} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </>
  );
}

/** Always six rows, so the sheet doesn't change height between months. */
const sixWeeks = (weeks: (string | null)[][]) => [
  ...weeks,
  ...Array.from({ length: 6 - weeks.length }, () => Array<null>(7).fill(null)),
];

const monthOf = (key: string) => {
  const d = fromDayKey(key);
  return { year: d.getFullYear(), month: d.getMonth() };
};

const DAY = 44;

const useStyles = makeStyles(({ theme }) => ({
  content: { gap: theme.space.xs, marginTop: -theme.space.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.space.md },
  month: { flex: 1 },
  off: { opacity: theme.opacity.disabled },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: DAY + 4 },
  // Every day has a fill from the start (Android rounding gotcha, docs/ARCHITECTURE.md).
  day: { width: DAY, height: DAY, borderRadius: DAY / 2, alignItems: 'center', justifyContent: 'center' },
  idle: { backgroundColor: theme.colors.background },
  selected: { backgroundColor: theme.colors.selected },
  pressed: { backgroundColor: theme.colors.surfaceStrong },
  dot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2 },
  dotOn: { backgroundColor: theme.colors.textMuted },
  dotOnInk: { backgroundColor: theme.colors.onSelected },
}));
