import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { numbersTier, sumMacros, type MealItem, type Sweetness } from '@/domain/meal';
import { formatNumber } from '@/lib/format';
import { getDish } from '@/data/dishes';
import { useHealthGuidance } from '@/store/health';
import { useEntry, useLog, type LogEntry } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Badge, Button, ConfirmSheet, PhotoSheet, Text } from '@/ui';

import { MealHealthNotes } from './components/MealHealthNotes';
import { MealItemRow } from './components/MealItemRow';
import { SaveBar } from './components/SaveBar';
import { useMealDraft } from './mealDraft';

/** Route `/shared-meal?id=`: turn a meal into a ဝိုင်းစား (Result → "Shared meal"). */
export function SharedMealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useEntry(id);
  if (!entry) return null;
  return <SharedMeal entry={entry} />;
}

/**
 * ဝိုင်းစား — a table of shared dishes, of which the person ate a share. One
 * question ("How much did you eat?") over one list: every dish, rice
 * included, is a row with its amount, grams, kcal and a stepper; 0 = didn't
 * eat it. Result shows this for shared meals instead of its own layout.
 * Changes stay in a draft (useMealDraft, which Search "+" adds to) until
 * Save; going back discards them. Save drops zero rows.
 */
export function SharedMeal({ entry }: { entry: LogEntry }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const updateEntry = useLog((st) => st.updateEntry);
  const removeEntry = useLog((st) => st.removeEntry);
  const draft = useMealDraft();
  const [confirming, setConfirming] = useState(false);
  const health = useHealthGuidance();

  // Start a draft from the meal when the screen opens; drop it when it closes.
  const entryId = entry.id;
  useEffect(() => {
    const saved = useLog.getState().entries.find((e) => e.id === entryId);
    if (!saved) return;
    useMealDraft.getState().start(saved.id, saved.items);
    return () => useMealDraft.getState().clear();
  }, [entryId]);
  const items = draft.id === entryId ? draft.items : entry.items;

  // By item, not dish: two scanned foods can share an "Other …" type.
  const set = (item: MealItem, qty: number) => draft.setItems(items.map((i) => (i === item ? { ...i, qty } : i)));

  const swap = (index: number, sweetness: Sweetness) =>
    draft.setItems(items.map((i, k) => (k === index ? { ...i, sweetness } : i)));

  const eaten = items.filter((i) => i.qty > 0);
  const total = sumMacros(eaten).kcal;
  const tier = numbersTier(eaten.map((i) => getDish(i.dishId)));
  const first = entry.items[0];
  const photo = entry.photoUri ?? (first && getDish(first.dishId).photo);

  const save = () => {
    updateEntry(entry.id, { items: eaten, isSharedMeal: true, confidence: 1, status: 'done' });
    router.dismissTo('/home');
  };
  const remove = () => {
    setConfirming(false);
    removeEntry(entry.id);
    router.dismissTo('/home');
  };

  return (
    <PhotoSheet
      photo={photo}
      backLabel={t('common.back')}
      action={{ icon: 'trash', label: t('result.delete'), onPress: () => setConfirming(true) }}
      footer={
        <SaveBar
          label={t('shared.save')}
          kcal={formatNumber(Math.round(total), language)}
          disabled={!eaten.length}
          onPress={save}
        />
      }>
      <View style={s.head}>
        <View style={s.badges}>
          <Badge icon="users" label={t('result.sharedMeal')} />
          {eaten.length > 0 && (
            <Badge
              key={tier}
              tone={tier === 'verified' ? 'ink' : 'surface'}
              icon={tier === 'verified' ? 'check' : undefined}
              label={t(`result.${tier}`)}
            />
          )}
        </View>
        <Text variant="headline" accessibilityRole="header">
          {t('shared.title')}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {items.map((item, i) => (
          <MealItemRow key={`${item.dishId}-${i}`} item={item} onChange={(q) => set(item, q)} />
        ))}
        {(health.on.bloodSugar || health.on.bloodPressure) && eaten.length > 0 && (
          <View style={s.health}>
            <MealHealthNotes items={items} on={health.on} onSwap={swap} />
          </View>
        )}
        <Button
          variant="secondary"
          icon="plus"
          label={t('shared.addMore')}
          onPress={() => router.push({ pathname: '/search', params: { addTo: entry.id } })}
          style={s.add}
        />
      </ScrollView>

      <ConfirmSheet
        visible={confirming}
        title={t('result.deleteTitle')}
        confirmLabel={t('result.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </PhotoSheet>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  head: { gap: theme.space.sm, alignItems: 'flex-start' },
  badges: { flexDirection: 'row', gap: theme.space.sm },
  list: { paddingBottom: theme.space.lg },
  add: { marginTop: theme.space.lg },
  health: { marginTop: theme.space.lg },
}));
