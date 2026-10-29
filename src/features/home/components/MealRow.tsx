import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KCAL_PER_RICE_PLATE } from '@/domain/nutrition';
import { formatNumber, formatPlates, formatTime } from '@/lib/format';
import { dishes } from '@/mocks/dishes';
import type { LogEntry } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Icon, Text } from '@/ui';

/** A logged meal: photo, name, time, macro chips, kcal. */
export function MealRow({ entry }: { entry: LogEntry }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const dish = dishes[entry.dishId];
  const plates = Math.round(((dish.carbG * 4) / KCAL_PER_RICE_PLATE) * 4) / 4;

  return (
    <View style={s.row}>
      <Image source={dish.photo} style={s.photo} contentFit="cover" transition={200} accessible={false} />
      <View style={s.body}>
        <View style={s.top}>
          <Text variant="bodyStrong" numberOfLines={1} style={s.name}>
            {dish.name[language]}
          </Text>
          <Text variant="caption" tone="subtle">
            {formatTime(entry.eatenAt, language)}
          </Text>
        </View>
        <View style={s.kcal}>
          <Icon name="flame" size={14} strokeWidth={2} />
          <Text variant="numberSm">{formatNumber(dish.kcal, language)}</Text>
          <Text variant="caption" tone="muted">
            {t('common.kcal')}
          </Text>
        </View>
        <View style={s.macros}>
          <Macro color={theme.colors.nutrient.carbs} text={formatPlates(plates, language)} icon="rice" />
          <Macro color={theme.colors.nutrient.protein} text={`${dish.proteinG}${t('common.g')}`} icon="fish" />
          <Macro color={theme.colors.nutrient.fat} text={`${dish.fatG}${t('common.g')}`} icon="drop" />
        </View>
      </View>
    </View>
  );
}

function Macro({ color, text, icon }: { color: string; text: string; icon: 'rice' | 'fish' | 'drop' }) {
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
  photo: { width: 84, height: 84, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceStrong },
  body: { flex: 1, justifyContent: 'center', gap: 2, paddingRight: theme.space.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  name: { flex: 1 },
  kcal: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  macros: { flexDirection: 'row', gap: theme.space.md, marginTop: 2 },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroText: { fontFamily: type.numberSm.fontFamily },
}));
