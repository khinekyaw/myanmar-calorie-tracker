import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { itemMacros, SWEETNESS, type MealItem, type Sweetness } from '@/domain/meal';
import { popularDishes, searchDishes } from '@/domain/search';
import { formatNumber, formatPlates } from '@/lib/format';
import { getDish, type Dish, type DishId } from '@/mocks/dishes';
import { useLog } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, Chip, Icon, IconButton, Screen, Stepper, Text } from '@/ui';

/**
 * Search by Burmese, English or romanized name ("laphet yay", "mont hin gar").
 * Tapping a result opens it in place: quantity, tea sweetness, Add.
 * With `?addTo=<entryId>` the dish is added to that meal (SharedMeal "+").
 */
export function FoodSearchScreen() {
  const { addTo } = useLocalSearchParams<{ addTo?: string }>();
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language, type } = useStyleContext();
  const addEntry = useLog((st) => st.addEntry);
  const updateEntry = useLog((st) => st.updateEntry);
  const target = useLog((st) => st.entries.find((e) => e.id === addTo));

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<MealItem | null>(null);

  const results: Dish[] = query.trim() ? searchDishes(query) : popularDishes.map(getDish);

  const select = (dish: Dish) =>
    setOpen((cur) =>
      cur?.dishId === dish.id
        ? null
        : { dishId: dish.id as DishId, qty: 1, ...(dish.hasSweetness && { sweetness: 'pawSeint' as Sweetness }) },
    );

  const add = () => {
    if (!open) return;
    if (target) {
      updateEntry(target.id, { items: [...target.items.filter((i) => i.dishId !== open.dishId), open] });
      router.back();
    } else {
      addEntry({ source: 'search', status: 'done', items: [open] });
      router.dismissTo('/home');
    }
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen>
        <View style={s.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          <View style={s.field}>
            <Icon name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={(q) => {
                setQuery(q);
                setOpen(null);
              }}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              placeholder={t('search.placeholder')}
              placeholderTextColor={theme.colors.iconMuted}
              selectionColor={theme.colors.text}
              accessibilityLabel={t('search.placeholder')}
              style={[type.body, s.input]}
            />
            {query !== '' && (
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10} onPress={() => setQuery('')}>
                <Icon name="close" size={18} color={theme.colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(d) => d.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <Text variant="body" tone="muted" align="center" style={s.empty}>
              {t('search.empty')}
            </Text>
          }
          renderItem={({ item: dish }) => {
            const isOpen = open?.dishId === dish.id;
            const other = language === 'my' ? dish.name.en : dish.name.my;
            return (
              // New key when opening: Android must mount the row with its fill to round it (shape rules).
              <View key={isOpen ? 'open' : 'closed'} style={[s.result, isOpen && s.resultOpen]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() => select(dish)}
                  style={s.resultRow}>
                  <View style={s.flex}>
                    <Text variant="bodyStrong">{dish.name[language]}</Text>
                    <Text variant="caption" tone="subtle">
                      {other}
                    </Text>
                  </View>
                  <Text variant="numberSm">{formatNumber(Math.round(isOpen && open ? itemMacros(open).kcal : dish.kcal), language)}</Text>
                  <Icon name={isOpen ? 'minus' : 'plus'} size={18} strokeWidth={2.2} color={theme.colors.textMuted} />
                </Pressable>

                {isOpen && open && (
                  <View style={s.details}>
                    {dish.hasSweetness && (
                      <View style={s.chips} accessibilityRole="radiogroup">
                        {SWEETNESS.map((k) => (
                          <Chip
                            key={k}
                            label={t(`search.${k}`)}
                            selected={open.sweetness === k}
                            look="onSurface"
                            onPress={() => setOpen({ ...open, sweetness: k })}
                          />
                        ))}
                      </View>
                    )}
                    <View style={s.addRow}>
                      <Stepper
                        variant="pill"
                        value={open.qty}
                        step={dish.unit === 'plate' || dish.unit === 'bowl' ? 0.5 : 1}
                        min={0.5}
                        max={20}
                        display={formatPlates(open.qty, language)}
                        onChange={(qty) => setOpen({ ...open, qty })}
                        decreaseLabel={t('result.less')}
                        increaseLabel={t('result.more')}
                      />
                      <Text variant="caption" tone="muted" style={s.flex}>
                        {t(`units.${dish.unit}`, { count: open.qty })}
                      </Text>
                      <Button label={t('search.add')} onPress={add} style={s.addButton} />
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
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
  input: { flex: 1, paddingVertical: 0, color: theme.colors.text },
  list: { paddingTop: theme.space.lg, paddingBottom: theme.space.xxxl, gap: theme.space.xs },
  empty: { marginTop: theme.space.xxxl },
  result: { borderRadius: theme.radius.lg },
  resultOpen: { backgroundColor: theme.colors.surface },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    minHeight: 64,
    paddingHorizontal: theme.space.md,
  },
  details: { paddingHorizontal: theme.space.md, paddingBottom: theme.space.md, gap: theme.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  addButton: { height: 44, paddingHorizontal: theme.space.xl },
}));
