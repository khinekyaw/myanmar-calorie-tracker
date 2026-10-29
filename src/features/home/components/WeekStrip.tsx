import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { tap } from '@/lib/haptics';
import { formatNumber } from '@/lib/format';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { dayKey } from '@/store/weights';
import { Text } from '@/ui';

/** Monday-first dates of the week containing `today`. */
function weekOf(today: Date) {
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

type Props = {
  selected: Date;
  onSelect: (day: Date) => void;
  /** Day keys (YYYY-MM-DD) that have at least one logged meal. */
  loggedDays: Set<string>;
};

/**
 * Week at a glance. Days with logs get a dashed ring, the selected day is
 * solid ink, future days are muted. Tapping a day shows its meals on Home.
 */
export function WeekStrip({ selected, onSelect, loggedDays }: Props) {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const today = new Date();
  const days = weekOf(today);
  const labels = t('home.weekdays', { returnObjects: true }) as string[];

  return (
    <View style={s.row}>
      {days.map((d, i) => {
        const isSelected = sameDay(d, selected);
        const isFuture = d > today && !sameDay(d, today);
        return (
          <Pressable
            key={d.toISOString()}
            disabled={isFuture}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isFuture }}
            accessibilityLabel={d.toDateString()}
            onPress={() => {
              tap();
              onSelect(d);
            }}
            style={s.day}>
            <Text variant="caption" tone={isSelected ? 'default' : 'subtle'}>
              {labels[i]}
            </Text>
            {/* Keyed by state so each look mounts fresh: a clean solid circle when selected,
                a dashed ring when logged (Android only rounds styles present at mount). */}
            <View
              key={isSelected ? 'selected' : loggedDays.has(dayKey(d)) ? 'logged' : 'plain'}
              style={[s.date, isSelected ? s.dateSelected : loggedDays.has(dayKey(d)) && s.dateLogged]}>
              <Text variant="numberSm" tone={isSelected ? 'inverse' : isFuture ? 'subtle' : 'default'} style={s.dateText}>
                {formatNumber(d.getDate(), language)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.space.lg },
  day: { flex: 1, alignItems: 'center', gap: theme.space.xs, minHeight: theme.size.minTouch },
  date: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dateSelected: { backgroundColor: theme.colors.selected },
  dateLogged: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.iconMuted },
  dateText: { fontSize: 13 },
}));
