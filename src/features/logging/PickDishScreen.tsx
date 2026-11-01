import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { popularDishes } from '@/domain/search';
import { getDish, listDishes, type DishId } from '@/data/dishes';
import { useEntry, useLog } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Badge, Button, Icon, PhotoSheet, Text } from '@/ui';

/** Options when the scan gave no runner-ups ("Fix" on a confident scan): same serving unit first. */
function fallbackOptions(current?: DishId): DishId[] {
  const unit = current && getDish(current).unit;
  const sameUnit = listDishes().filter((d) => d.unit === unit).map((d) => d.id as DishId);
  return [...new Set([...(current ? [current] : []), ...sameUnit, ...popularDishes])];
}

/**
 * Low-confidence picker: top 3 guesses, the first tagged "closest", plus
 * "something else" which goes to voice/text logging.
 */
export function PickDishScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const entry = useEntry(id);
  const updateEntry = useLog((st) => st.updateEntry);

  const current = entry?.items[0];
  const options: DishId[] = (entry?.candidates?.map((c) => c.dishId) ?? fallbackOptions(current?.dishId)).slice(0, 3);
  const [picked, setPicked] = useState<DishId | undefined>(options[0]);

  const choose = () => {
    if (!entry || !picked) return;
    const dish = getDish(picked);
    const qty = current && getDish(current.dishId).unit === dish.unit ? current.qty : 1;
    updateEntry(entry.id, { items: [{ dishId: picked, qty, oil: 'normal' }], confidence: 1, status: 'done' });
    if (from === 'result') router.back();
    else router.replace({ pathname: '/result', params: { id: entry.id } });
  };

  return (
    <PhotoSheet
      photo={entry?.photoUri ?? (current && getDish(current.dishId).photo)}
      backLabel={t('common.back')}
      footer={<Button label={t('pick.choose')} disabled={!picked} onPress={choose} />}>
      <Text variant="title" accessibilityRole="header">
        {t('pick.title')}
      </Text>
      <View style={s.list} accessibilityRole="radiogroup">
        {options.map((dishId, i) => {
          const selected = dishId === picked;
          return (
            <Pressable
              key={dishId}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setPicked(dishId)}
              style={[s.option, selected ? s.selected : s.idle]}>
              <Text variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'inverse' : 'default'} style={s.flex}>
                {getDish(dishId).name[language]}
              </Text>
              {i === 0 && (
                <Badge
                  key={String(selected)}
                  tone={selected ? 'onInk' : 'white'}
                  label={t('pick.closest')}
                  style={s.badge}
                />
              )}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={() => entry && router.push({ pathname: '/text-log', params: { id: entry.id } })}
          style={({ pressed }) => [s.option, s.idle, pressed && s.pressed]}>
          <Icon name="mic" size={18} color={theme.colors.icon} />
          <Text variant="body">{t('pick.other')}</Text>
        </Pressable>
      </View>
    </PhotoSheet>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  flex: { flex: 1 },
  // Badge aligns itself to the top by default (for columns); centre it on the row.
  badge: { alignSelf: 'center' },
  list: { gap: theme.space.sm },
  option: {
    minHeight: 60,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  idle: { backgroundColor: theme.colors.surface },
  selected: { backgroundColor: theme.colors.selected },
  pressed: { backgroundColor: theme.colors.surfaceStrong },
}));
