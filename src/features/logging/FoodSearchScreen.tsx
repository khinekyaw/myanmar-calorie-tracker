import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { itemMacros, sumMacros, SWEETNESS, type MealItem, type Sweetness } from '@/domain/meal';
import { popularDishes, searchDishes } from '@/domain/search';
import { tap } from '@/lib/haptics';
import { formatNumber, formatPlates } from '@/lib/format';
import { fallbackDishes, getDish, type Dish, type DishId } from '@/data/dishes';
import { recordSearchMiss } from '@/db/searchMisses';
import { useLog } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Chip, EdgeScrollView, FadeEdge, Icon, IconButton, Screen, Stepper, Text } from '@/ui';

import { amountLabel } from './amountLabel';
import { SaveBar } from './components/SaveBar';
import { useMealDraft } from './mealDraft';

/**
 * Search by Burmese, English or romanized name ("laphet yay", "mont hin gar").
 * Tap dishes to pick several (each with its amount and tea sweetness); picked
 * dishes stay as chips under the field while you search for the next one,
 * and one button logs each as its own entry.
 * With `?addTo=<entryId>` they go into that meal's unsaved draft (SharedMeal "+").
 * Under the results of a typed search come the "Other …" types, for food not
 * on the list; searches that find nothing are recorded (db/searchMisses.ts).
 */
export function FoodSearchScreen() {
  const { addTo } = useLocalSearchParams<{ addTo?: string }>();
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const addEntry = useLog((st) => st.addEntry);
  const draftId = useMealDraft((st) => st.id);
  const putInDraft = useMealDraft((st) => st.put);
  const target = addTo && draftId === addTo;

  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<MealItem[]>([]);

  const typed = query.trim();
  const matches: Dish[] = typed ? searchDishes(typed) : popularDishes.map(getDish);
  const results = typed ? [...matches, ...fallbackDishes()] : matches;
  const total = sumMacros(picked).kcal;

  // A search that still finds nothing after a pause is a dish to add next.
  const missed = typed && !matches.length ? typed : '';
  useEffect(() => {
    if (!missed) return;
    const timer = setTimeout(() => recordSearchMiss(missed), MISS_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [missed]);

  const toggle = (dish: Dish) => {
    tap();
    setPicked((cur) =>
      cur.some((i) => i.dishId === dish.id)
        ? cur.filter((i) => i.dishId !== dish.id)
        : [...cur, { dishId: dish.id as DishId, qty: 1, ...(dish.hasSweetness && { sweetness: 'pawSeint' as Sweetness }) }],
    );
  };
  const change = (item: MealItem) => setPicked((cur) => cur.map((i) => (i.dishId === item.dishId ? item : i)));

  const add = () => {
    if (!picked.length) return;
    if (target) {
      picked.forEach(putInDraft);
      router.back();
    } else {
      // One entry per dish, listed (newest first) in the order they were picked.
      const now = Date.now();
      [...picked].reverse().forEach((item, i) =>
        addEntry({ source: 'search', status: 'done', items: [item], eatenAt: new Date(now - picked.length + 1 + i) }),
      );
      router.dismissTo('/home');
    }
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen
        footer={
          picked.length > 0 ? (
            <SaveBar
              label={t('search.addDishes', { count: picked.length })}
              kcal={formatNumber(Math.round(total), language)}
              onPress={add}
            />
          ) : undefined
        }>
        <View style={s.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          <View style={s.field}>
            <Icon name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              placeholder={t('search.placeholder')}
              placeholderTextColor={theme.colors.iconMuted}
              selectionColor={theme.colors.selection}
              cursorColor={theme.colors.cursor}
              selectionHandleColor={theme.colors.cursor}
              accessibilityLabel={t('search.placeholder')}
              style={s.input}
            />
            {query !== '' && (
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10} onPress={() => setQuery('')}>
                <Icon name="close" size={18} color={theme.colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {picked.length > 0 && (
          <EdgeScrollView keyboardShouldPersistTaps="handled" style={s.pickedBar} contentContainerStyle={s.picked}>
            {picked.map((item) => {
              const dish = getDish(item.dishId);
              return (
                <Chip
                  key={item.dishId}
                  icon="close"
                  selected
                  label={item.qty === 1 ? dish.name[language] : `${dish.name[language]} ×${formatPlates(item.qty, language)}`}
                  accessibilityLabel={`${t('search.remove')} ${dish.name[language]}`}
                  onPress={() => toggle(dish)}
                />
              );
            })}
          </EdgeScrollView>
        )}

        <View style={s.flex}>
          <FlatList
            data={results}
            keyExtractor={(d) => d.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.list}
            renderItem={({ item: dish, index }) => {
              const item = picked.find((i) => i.dishId === dish.id);
              const other = language === 'my' ? dish.name.en : dish.name.my;
              const row = (
                // New key when picked: Android must mount the row with its fill to round it (shape rules).
                <View key={item ? 'picked' : 'idle'} style={[s.result, item && s.resultPicked]}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: Boolean(item) }}
                    onPress={() => toggle(dish)}
                    style={s.resultRow}>
                    <View style={s.flex}>
                      <Text variant="bodyStrong">{dish.name[language]}</Text>
                      <Text variant="caption" tone="subtle">
                        {other}
                      </Text>
                    </View>
                    <Text variant="numberSm">{formatNumber(Math.round(item ? itemMacros(item).kcal : dish.kcal), language)}</Text>
                    <Icon name={item ? 'check' : 'plus'} size={18} strokeWidth={2.2} color={item ? theme.colors.text : theme.colors.textMuted} />
                  </Pressable>

                  {item && (
                    <View style={s.details}>
                      {dish.hasSweetness && (
                        <View style={s.chips} accessibilityRole="radiogroup">
                          {SWEETNESS.map((k) => (
                            <Chip
                              key={k}
                              label={t(`search.${k}`)}
                              selected={item.sweetness === k}
                              look="onSurface"
                              onPress={() => change({ ...item, sweetness: k })}
                            />
                          ))}
                        </View>
                      )}
                      <View style={s.amountRow}>
                        <Stepper
                          variant="pill"
                          value={item.qty}
                          step={dish.unit === 'plate' || dish.unit === 'bowl' ? 0.5 : 1}
                          min={0.5}
                          max={20}
                          display={formatPlates(item.qty, language)}
                          onChange={(qty) => change({ ...item, qty })}
                          decreaseLabel={t('result.less')}
                          increaseLabel={t('result.more')}
                        />
                        <Text variant="caption" tone="muted" style={s.flex}>
                          {amountLabel(t, dish, item.qty, language)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
              if (index !== matches.length || !typed) return row;
              // The first "Other …" type gets a heading.
              return (
                <View>
                  <Text variant="label" tone="muted" style={[s.otherHeading, index === 0 && s.otherHeadingFirst]}>
                    {t(matches.length ? 'search.notHere' : 'search.notFound')}
                  </Text>
                  {row}
                </View>
              );
            }}
          />
          {/* Results fade out under the search field, chips and Add button instead of being cut. */}
          <FadeEdge />
          {picked.length > 0 && <FadeEdge edge="bottom" />}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** How long a search must sit with no results before it counts as a miss. */
const MISS_PAUSE_MS = 1500;

const useStyles = makeStyles(({ theme, type }) => ({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, paddingTop: theme.space.md },
  field: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  // Fills the pill and centres its text. No fixed lineHeight: Android's text
  // field draws Burmese stacked letters taller than it and clips them.
  input: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
    color: theme.colors.text,
  },
  // Padding ≥ FadeEdge height, so the fades cover nothing until the list scrolls.
  list: { paddingTop: theme.space.xxl, paddingBottom: theme.space.xxxl, gap: theme.space.xs },
  otherHeading: { paddingHorizontal: theme.space.md, marginTop: theme.space.xl, marginBottom: theme.space.sm },
  otherHeadingFirst: { marginTop: 0 },
  result: { borderRadius: theme.radius.lg },
  resultPicked: { backgroundColor: theme.colors.surface },
  pickedBar: { marginTop: theme.space.md },
  picked: { gap: theme.space.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    minHeight: 64,
    paddingHorizontal: theme.space.md,
  },
  details: { paddingHorizontal: theme.space.md, paddingBottom: theme.space.md, gap: theme.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
}));
