import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { carbsToRicePlates, sumMacros } from '@/domain/meal';
import { formatNumber, formatPlates, formatTime } from '@/lib/format';
import { getDish } from '@/mocks/dishes';
import type { LogEntry } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Icon, Text, type IconName } from '@/ui';

/** A logged meal (photo, name, time, kcal, macros) or a photo still in the queue. */
export function MealRow({ entry }: { entry: LogEntry }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const first = entry.items[0] ? getDish(entry.items[0].dishId) : undefined;
  const photo = entry.photoUri ?? first?.photo;
  const pending = entry.status !== 'done';

  const open = () => router.push({ pathname: '/result', params: { id: entry.id } });

  if (pending) {
    const analyzing = entry.status === 'analyzing';
    return (
      <Pressable
        accessibilityRole="button"
        disabled={!analyzing}
        onPress={open}
        style={({ pressed }) => [s.row, pressed && s.pressed]}>
        <View>
          {photo && <Image source={photo} style={[s.photo, s.photoDim]} contentFit="cover" />}
          <View style={s.overlay}>
            {analyzing ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Icon name="clock" size={22} strokeWidth={2} color={theme.colors.textInverse} />
            )}
          </View>
        </View>
        <View style={s.body}>
          <Text variant="bodyStrong">{analyzing ? t('queue.analyzing') : t('queue.waiting')}</Text>
          <Text variant="caption" tone="subtle">
            {formatTime(entry.eatenAt, language)}
          </Text>
        </View>
      </Pressable>
    );
  }

  const m = sumMacros(entry.items);
  const names = entry.items.filter((i) => i.qty > 0).map((i) => getDish(i.dishId).name[language]);
  const title = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');

  return (
    <Pressable accessibilityRole="button" onPress={open} style={({ pressed }) => [s.row, pressed && s.pressed]}>
      {photo ? (
        <Image source={photo} style={s.photo} contentFit="cover" transition={200} accessible={false} />
      ) : (
        <View style={[s.photo, s.noPhoto]}>
          <Icon name={sourceIcon(entry.source)} size={26} color={theme.colors.iconMuted} />
        </View>
      )}
      <View style={s.body}>
        <View style={s.top}>
          <Text variant="bodyStrong" numberOfLines={1} style={s.name}>
            {title}
          </Text>
          <Text variant="caption" tone="subtle">
            {formatTime(entry.eatenAt, language)}
          </Text>
        </View>
        <View style={s.kcal}>
          <Icon name="flame" size={14} strokeWidth={2} />
          <Text variant="numberSm">{formatNumber(Math.round(m.kcal), language)}</Text>
          <Text variant="caption" tone="muted">
            {t('common.kcal')}
          </Text>
        </View>
        <View style={s.macros}>
          <Macro color={theme.colors.nutrient.carbs} text={formatPlates(Math.round(carbsToRicePlates(m.carbG) * 4) / 4, language)} icon="rice" />
          <Macro color={theme.colors.nutrient.protein} text={`${Math.round(m.proteinG)}${t('common.g')}`} icon="protein" />
          <Macro color={theme.colors.nutrient.fat} text={`${Math.round(m.fatG)}${t('common.g')}`} icon="oil" />
        </View>
      </View>
    </Pressable>
  );
}

const sourceIcon = (source: LogEntry['source']): IconName =>
  ({ photo: 'camera', voice: 'mic', text: 'keyboard', search: 'search', quick: 'plus' })[source] as IconName;

function Macro({ color, text, icon }: { color: string; text: string; icon: 'rice' | 'protein' | 'oil' }) {
  const s = useStyles();
  return (
    <View style={s.macro}>
      <Icon name={icon} size={13} strokeWidth={2.2} color={color} />
      <Text variant="caption" tone="muted" style={s.macroText}>
        {text}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ theme, type }) => ({
  row: {
    flexDirection: 'row',
    gap: theme.space.md,
    padding: theme.space.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: theme.opacity.pressed },
  photo: { width: 84, height: 84, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceStrong },
  photoDim: { opacity: 0.85 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.photo.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, justifyContent: 'center', gap: 2, paddingRight: theme.space.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  name: { flex: 1 },
  kcal: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  macros: { flexDirection: 'row', gap: theme.space.md, marginTop: 2 },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroText: { fontFamily: type.numberSm.fontFamily },
}));
