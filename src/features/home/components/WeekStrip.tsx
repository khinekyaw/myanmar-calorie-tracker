import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { calorieDay } from '@/domain/badges';
import { tap } from '@/lib/haptics';
import { formatNumber } from '@/lib/format';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { dayKey } from '@/store/weights';
import { Icon, Ring, Text } from '@/ui';

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

const RING = 40;
const STROKE = 2.5;

type Props = {
  selected: Date;
  onSelect: (day: Date) => void;
  /** kcal eaten per day key (YYYY-MM-DD); days without meals are absent. */
  kcalByDay: Map<string, number>;
  targetKcal: number;
};

/**
 * Week at a glance. A ring around each logged day fills with its share of
 * the calorie target; a finished day on target (85–105 %) gets a check, a day
 * over the target turns amber. The selected day is a solid circle the size of
 * a ring (ink, or amber when over), future days are muted. Tapping a day
 * shows its meals on Home.
 */
export function WeekStrip({ selected, onSelect, kcalByDay, targetKcal }: Props) {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const today = new Date();
  const days = weekOf(today);
  const labels = t('home.weekdays', { returnObjects: true }) as string[];

  return (
    <View style={s.row}>
      {days.map((d, i) => {
        const isSelected = sameDay(d, selected);
        const isToday = sameDay(d, today);
        const isFuture = d > today && !isToday;
        const kcal = kcalByDay.get(dayKey(d)) ?? 0;
        const state = calorieDay(kcal, targetKcal);
        // Today isn't over, so it can't be "on target" yet; it can already be over.
        const checked = state === 'onTarget' && !isToday;
        const over = state === 'over';
        const status = checked ? t('home.dayOnTarget') : over ? t('home.caloriesOver') : '';
        return (
          <Pressable
            key={d.toISOString()}
            disabled={isFuture}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isFuture }}
            accessibilityLabel={status ? `${d.toDateString()}, ${status}` : d.toDateString()}
            onPress={() => {
              tap();
              onSelect(d);
            }}
            style={s.day}>
            <Text variant="caption" tone={isSelected ? 'default' : 'subtle'}>
              {labels[i]}
            </Text>
            <View style={s.dateBox}>
              {state !== 'none' && !isSelected && (
                <View style={s.ring}>
                  <Ring
                    progress={over ? 1 : kcal / targetKcal}
                    size={RING}
                    stroke={STROKE}
                    color={over ? theme.colors.kcal.over : theme.colors.primary}
                  />
                </View>
              )}
              {/* Keyed by state so each look mounts fresh (Android only rounds styles present at mount). */}
              <View
                key={isSelected ? (over ? 'selectedOver' : 'selected') : 'plain'}
                style={[s.date, isSelected && (over ? s.dateSelectedOver : s.dateSelected)]}>
                <Text
                  variant="numberSm"
                  // Ink text on amber (white on amber is too faint).
                  tone={isSelected && !over ? 'inverse' : isFuture ? 'subtle' : 'default'}
                  style={s.dateText}>
                  {formatNumber(d.getDate(), language)}
                </Text>
              </View>
              {checked && (
                <View style={s.check}>
                  <Icon name="check" size={9} strokeWidth={3.5} color={theme.colors.onPrimary} />
                </View>
              )}
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
  dateBox: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', left: 0, top: 0 },
  date: { width: RING, height: RING, borderRadius: RING / 2, alignItems: 'center', justifyContent: 'center' },
  dateSelected: { backgroundColor: theme.colors.selected },
  dateSelectedOver: { backgroundColor: theme.colors.kcal.over },
  dateText: { fontSize: 13 },
  // Small ink badge on the ring's top-right, with a white edge to lift it off the ring.
  check: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.background,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
