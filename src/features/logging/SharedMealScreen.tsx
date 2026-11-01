import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { itemMacros, sumMacros, type MealItem } from '@/domain/meal';
import { formatNumber, formatPlates } from '@/lib/format';
import { freeSides, getDish, type DishId } from '@/data/dishes';
import { useEntry, useLog } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Chip, Icon, IconButton, Screen, Stepper, Text } from '@/ui';

import { SaveBar } from './components/SaveBar';
import { useMealDraft } from './mealDraft';

/**
 * ဝိုင်းစား — a family table with shared curries. Rice in plates (½ steps),
 * each curry in spoonfuls, free sides as toggles. Changes stay in a draft
 * (useMealDraft, which Search "+" adds to) until Save; going back discards
 * them. Save drops zero rows.
 */
/** A shared table always has a rice row (1 plate to start). */
const withRice = (items: MealItem[]): MealItem[] =>
  items.some((i) => i.dishId === 'rice') ? items : [{ dishId: 'rice', qty: 1 }, ...items];

export function SharedMealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const entry = useEntry(id);
  const updateEntry = useLog((st) => st.updateEntry);
  const draft = useMealDraft();

  // Start a draft from the meal when the editor opens; drop it when it closes.
  const entryId = entry?.id;
  useEffect(() => {
    const saved = useLog.getState().entries.find((e) => e.id === entryId);
    if (!saved) return;
    useMealDraft.getState().start(saved.id, withRice(saved.items));
    return () => useMealDraft.getState().clear();
  }, [entryId]);
  const stored = draft.id === entryId ? draft.items : withRice(entry?.items ?? []);
  const items: MealItem[] = [
    ...stored,
    ...freeSides.filter((d) => !stored.some((i) => i.dishId === d)).map((dishId) => ({ dishId, qty: 0 })),
  ];

  const set = (dishId: DishId, qty: number) => {
    const exists = stored.some((i) => i.dishId === dishId);
    draft.setItems(exists ? stored.map((i) => (i.dishId === dishId ? { ...i, qty } : i)) : [...stored, { dishId, qty }]);
  };

  const rice = items.find((i) => i.dishId === 'rice');
  const dishes = items.filter((i) => i.dishId !== 'rice' && !freeSides.includes(i.dishId));
  const sides = items.filter((i) => freeSides.includes(i.dishId));
  const total = sumMacros(items.filter((i) => i.qty > 0)).kcal;

  const save = () => {
    if (!entry) return;
    updateEntry(entry.id, { items: stored.filter((i) => i.qty > 0), isSharedMeal: true, confidence: 1, status: 'done' });
    router.dismissTo('/home');
  };

  return (
    <Screen
      footer={<SaveBar label={t('shared.save')} kcal={formatNumber(Math.round(total), language)} onPress={save} />}>
      <View style={s.header}>
        <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text variant="title" accessibilityRole="header">
          {t('shared.title')}
        </Text>

        {rice && (
          <View style={s.riceCard}>
            <Icon name="rice" size={28} />
            <Text variant="bodyStrong" style={s.flex}>
              {getDish('rice').name[language]}
            </Text>
            <Stepper
              value={rice.qty}
              step={0.5}
              max={8}
              display={formatPlates(rice.qty, language) || '0'}
              onChange={(q) => set('rice', q)}
              decreaseLabel={`${getDish('rice').name[language]} ${t('result.less')}`}
              increaseLabel={`${getDish('rice').name[language]} ${t('result.more')}`}
            />
          </View>
        )}

        <View>
          {dishes.map((item, i) => {
            const dish = getDish(item.dishId);
            const off = item.qty === 0;
            return (
              <View key={item.dishId} style={[s.row, i < dishes.length - 1 && s.divider]}>
                <View style={s.flex}>
                  <Text variant="body" tone={off ? 'subtle' : 'default'}>
                    {dish.name[language]}
                  </Text>
                  <Text variant="caption" tone="subtle">
                    {t(`units.${dish.unit}`, { count: item.qty })} · {formatNumber(Math.round(itemMacros(item).kcal), language)}
                  </Text>
                </View>
                <Stepper
                  value={item.qty}
                  step={dish.unit === 'spoon' ? 1 : 0.5}
                  max={30}
                  display={formatPlates(item.qty, language) || '0'}
                  onChange={(q) => set(item.dishId, q)}
                  decreaseLabel={`${dish.name[language]} ${t('result.less')}`}
                  increaseLabel={`${dish.name[language]} ${t('result.more')}`}
                />
              </View>
            );
          })}
        </View>

        <View style={s.sides}>
          {sides.map((item) => (
            <Chip
              key={item.dishId}
              label={getDish(item.dishId).name[language]}
              selected={item.qty > 0}
              onPress={() => set(item.dishId, item.qty > 0 ? 0 : 1)}
            />
          ))}
          <Chip
            icon="plus"
            accessibilityLabel={t('shared.addMore')}
            onPress={() => entry && router.push({ pathname: '/search', params: { addTo: entry.id } })}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  flex: { flex: 1 },
  header: { flexDirection: 'row', paddingTop: theme.space.md },
  scroll: { gap: theme.space.lg, paddingTop: theme.space.xxl, paddingBottom: theme.space.lg },
  riceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, minHeight: 68, paddingVertical: theme.space.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.hairline },
  sides: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
}));
