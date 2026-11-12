import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { itemName, numbersTier, OIL_LEVELS, sumMacros, type MealItem, type OilLevel, type Sweetness } from '@/domain/meal';
import { formatNumber, formatPlates } from '@/lib/format';
import { getDish, type DishId } from '@/data/dishes';
import { tap } from '@/lib/haptics';
import { CONFIDENCE_THRESHOLD } from '@/services/scan';
import { useHealthGuidance } from '@/store/health';
import { useEntry, useLog } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Badge, Button, Chip, ConfirmSheet, EdgeScrollView, Icon, PhotoSheet, Stepper, Text, type IconName } from '@/ui';

import { MealHealthNotes } from './components/MealHealthNotes';
import { MealItemRow } from './components/MealItemRow';
import { retryScan, useWaitReason, type WaitReason } from './scanQueue';
import { SharedMeal } from './SharedMealScreen';

const OIL_LABEL = { less: 'result.oilLess', normal: 'result.oilNormal', more: 'result.oilMore' } as const;

/** A photo that isn't a meal yet, and why (see useWaitReason). */
const WAITING = {
  quota: { icon: 'clock', title: 'result.waitQuota' },
  offline: { icon: 'cloudOff', title: 'result.waitOffline' },
  failed: { icon: 'image', title: 'result.waitFailed' },
  empty: { icon: 'search', title: 'result.waitEmpty' },
} as const satisfies Record<Exclude<WaitReason, 'analyzing'>, { icon: IconName; title: string }>;

/**
 * Scan result for one log entry. While the photo is being analysed it shows
 * a loading state, then routes low-confidence scans to PickDish (AI scan
 * contract rules); a shared table shows the ဝိုင်းစား list (SharedMeal). A
 * photo that is waiting (no free scans, offline, failed) or had no food says
 * why, with a way on.
 */
export function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const entry = useEntry(id);
  const updateEntry = useLog((st) => st.updateEntry);
  const removeEntry = useLog((st) => st.removeEntry);
  const [confirming, setConfirming] = useState(false);
  const health = useHealthGuidance();

  const analyzing = !entry || entry.status !== 'done';
  const lowConfidence = (entry?.confidence ?? 1) < CONFIDENCE_THRESHOLD;
  const reason = useWaitReason(entry);

  // The meal was deleted (here or elsewhere): nothing left to show.
  useEffect(() => {
    if (id && !entry) router.dismissTo('/home');
  }, [id, entry]);

  // Branch once the scan answer arrives (only for fresh, unreviewed scans).
  useEffect(() => {
    if (!entry || entry.status !== 'done' || entry.source !== 'photo' || !entry.items.length) return;
    if (!entry.isSharedMeal && lowConfidence) router.replace({ pathname: '/pick-dish', params: { id: entry.id } });
  }, [entry, lowConfidence]);

  const first = entry?.items[0];
  const dish = first ? getDish(first.dishId) : undefined;
  const photo = entry?.photoUri ?? dish?.photo;

  const deleteEntry = () => {
    setConfirming(false);
    if (entry) removeEntry(entry.id);
  };
  const confirmDelete = (
    <ConfirmSheet
      visible={confirming}
      title={t('result.deleteTitle')}
      confirmLabel={t('result.delete')}
      cancelLabel={t('common.cancel')}
      onConfirm={deleteEntry}
      onCancel={() => setConfirming(false)}
    />
  );

  if (entry && reason && reason !== 'analyzing') {
    // Log it by words instead: replaces the items, no scan used.
    const sayOrType = () => router.replace({ pathname: '/text-log', params: { id: entry.id } });
    return (
      <PhotoSheet
        photo={photo}
        backLabel={t('common.back')}
        onBack={() => router.dismissTo('/home')}
        action={{ icon: 'trash', label: t('result.delete'), onPress: () => setConfirming(true) }}
        footer={
          <View style={s.footer}>
            <Button
              variant={reason === 'empty' ? 'primary' : 'secondary'}
              label={t('add.voice')}
              style={s.flex}
              onPress={sayOrType}
            />
            {reason === 'quota' && (
              <Button label={t('paywall.title')} style={s.flex} onPress={() => router.push('/paywall')} />
            )}
            {reason === 'failed' && <Button label={t('common.retry')} style={s.flex} onPress={() => retryScan(entry)} />}
            {reason === 'offline' && (
              <Button label={t('result.done')} style={s.flex} onPress={() => router.dismissTo('/home')} />
            )}
          </View>
        }>
        <View style={s.waiting} accessibilityLiveRegion="polite">
          <Icon name={WAITING[reason].icon} size={28} color={theme.colors.icon} />
          <Text variant="headline" accessibilityRole="header">
            {t(WAITING[reason].title)}
          </Text>
          {reason === 'quota' && (
            <Text variant="body" tone="muted">
              {t('result.waitQuotaNote')}
            </Text>
          )}
        </View>
        {confirmDelete}
      </PhotoSheet>
    );
  }

  if (analyzing || !entry || !first || !dish) {
    return (
      <PhotoSheet photo={photo} backLabel={t('common.back')}>
        <View style={s.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.colors.text} />
          <Text variant="body" tone="muted">
            {t('result.analyzing')}
          </Text>
        </View>
        <View style={[s.skeleton, { width: '60%' }]} />
        <View style={[s.skeleton, s.skeletonTall]} />
        <View style={s.macros}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[s.skeleton, s.skeletonTile]} />
          ))}
        </View>
      </PhotoSheet>
    );
  }

  if (entry.isSharedMeal) return <SharedMeal entry={entry} />;

  const single = entry.items.length === 1;
  const totals = sumMacros(entry.items);
  const title = entry.items.map((i) => itemName(i, language)).join(', ');
  const tier = numbersTier(entry.items.map((i) => getDish(i.dishId)));
  const oil = first.oil ?? 'normal';
  const unitStep = dish.unit === 'plate' || dish.unit === 'bowl' ? 0.5 : 1;

  const setQty = (qty: number) => updateEntry(entry.id, { items: [{ ...first, qty }] });
  // Several items: each has its own row; 0 takes it out of the meal.
  const setItemQty = (item: MealItem, qty: number) =>
    updateEntry(entry.id, {
      items: qty > 0 ? entry.items.map((i) => (i === item ? { ...i, qty } : i)) : entry.items.filter((i) => i !== item),
    });
  // Toppings and sides often added to these dishes, not already in the meal.
  const addOns = [...new Set(entry.items.flatMap((i) => getDish(i.dishId).addOns ?? []))].filter(
    (id) => !entry.items.some((i) => i.dishId === id && !i.custom),
  );
  const addOn = (dishId: DishId) => {
    tap();
    updateEntry(entry.id, { items: [...entry.items, { dishId, qty: 1 }] });
  };
  const swapSweetness = (index: number, sweetness: Sweetness) =>
    updateEntry(entry.id, { items: entry.items.map((i, k) => (k === index ? { ...i, sweetness } : i)) });
  const cycleOil = () => {
    const next: OilLevel = OIL_LEVELS[(OIL_LEVELS.indexOf(oil) + 1) % OIL_LEVELS.length];
    updateEntry(entry.id, { items: entry.items.map((i) => ({ ...i, oil: next })) });
  };

  return (
    <PhotoSheet
      photo={photo}
      backLabel={t('common.back')}
      onBack={() => router.dismissTo('/home')}
      action={{ icon: 'trash', label: t('result.delete'), onPress: () => setConfirming(true) }}
      footer={
        <View style={s.footer}>
          <Button
            variant="secondary"
            label={t('result.fix')}
            style={s.flex}
            onPress={() => router.push({ pathname: '/pick-dish', params: { id: entry.id, from: 'result' } })}
          />
          <Button label={t('result.done')} style={s.flex} onPress={() => router.dismissTo('/home')} />
        </View>
      }>
      <View style={s.titleRow}>
        <View style={s.titleWrap}>
          <Text variant="headline" accessibilityRole="header" numberOfLines={2} style={s.title}>
            {title}
          </Text>
          <Badge
            key={tier}
            tone={tier === 'verified' ? 'ink' : 'surface'}
            icon={tier === 'verified' ? 'check' : undefined}
            label={t(`result.${tier}`)}
          />
        </View>
        {single && (
          <Stepper
            variant="pill"
            value={first.qty}
            step={unitStep}
            min={unitStep}
            max={20}
            display={formatPlates(first.qty, language)}
            onChange={setQty}
            decreaseLabel={t('result.less')}
            increaseLabel={t('result.more')}
          />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={s.bleed} contentContainerStyle={s.scroll}>
        <View style={s.kcalCard}>
          <Icon name="flame" size={24} strokeWidth={2} />
          <Text variant="numberLg">{formatNumber(Math.round(totals.kcal), language)}</Text>
          <Text variant="label" tone="muted">
            {t('common.kcal')}
          </Text>
        </View>

        <View style={s.macros}>
          <MacroTile label={t('result.carbs')} grams={totals.carbG} color={theme.colors.nutrient.carbs} />
          <MacroTile label={t('result.protein')} grams={totals.proteinG} color={theme.colors.nutrient.protein} />
          <MacroTile label={t('result.fat')} grams={totals.fatG} color={theme.colors.nutrient.fat} />
        </View>

        <MealHealthNotes items={entry.items} on={health.on} onSwap={swapSweetness} />

        {!single && (
          <View>
            {entry.items.map((item, i) => (
              <MealItemRow
                key={`${item.dishId}-${i}`}
                item={item}
                onChange={(q) => setItemQty(item, q)}
                divider={i < entry.items.length - 1}
              />
            ))}
          </View>
        )}

        {addOns.length > 0 && (
          <EdgeScrollView contentContainerStyle={s.addOns}>
            {addOns.map((id) => (
              <Chip key={id} icon="plus" label={getDish(id).name[language]} onPress={() => addOn(id)} />
            ))}
          </EdgeScrollView>
        )}

        <View style={s.actions}>
          <Chip
            icon="users"
            label={t('result.sharedMeal')}
            style={s.flex}
            onPress={() => router.push({ pathname: '/shared-meal', params: { id: entry.id } })}
          />
          {dish.oilSensitive && (
            <Chip
              icon="oil"
              label={t('result.oil', { level: t(OIL_LABEL[oil]) })}
              style={s.flex}
              onPress={cycleOil}
            />
          )}
        </View>
      </ScrollView>
      {confirmDelete}
    </PhotoSheet>
  );
}

function MacroTile({ label, grams, color }: { label: string; grams: number; color: string }) {
  const s = useStyles();
  const { t } = useTranslation();
  return (
    <View style={s.tile}>
      <View style={s.tileLabel}>
        <View style={[s.dot, { backgroundColor: color }]} />
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      </View>
      <Text variant="numberMd" style={s.tileValue}>
        {Math.round(grams)}
        {t('common.g')}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  flex: { flex: 1 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  waiting: { gap: theme.space.md, alignItems: 'flex-start' },
  skeleton: { height: 22, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface },
  skeletonTall: { height: 72, borderRadius: theme.radius.lg },
  skeletonTile: { flex: 1, height: 64, borderRadius: theme.radius.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.space.md },
  titleWrap: { flex: 1, gap: theme.space.sm, alignItems: 'flex-start' },
  title: { flexShrink: 1 },
  kcalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg + 2,
    paddingVertical: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  macros: { flexDirection: 'row', gap: theme.space.sm },
  tile: {
    flex: 1,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    gap: 2,
  },
  tileLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tileValue: { fontSize: 18 },
  actions: { flexDirection: 'row', gap: theme.space.sm },
  // Full width, so the add-on chips scroll to the screen edges (edge-to-edge rule).
  bleed: { marginHorizontal: -theme.gutter },
  scroll: { gap: theme.space.lg, paddingBottom: theme.space.lg, paddingHorizontal: theme.gutter },
  addOns: { gap: theme.space.sm },
  footer: { flexDirection: 'row', gap: theme.space.sm },
}));
