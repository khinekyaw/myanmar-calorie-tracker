import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { tap } from '@/lib/haptics';
import { dishes, quickRelog, type DishId } from '@/data/dishes';
import { useLog } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Icon, SHEET_OVERHANG, Text, useSheetMotion, type IconName } from '@/ui';

type Tile = { key: 'photo' | 'voice'; icon: IconName; href: Href };

/**
 * Bottom sheet: a search box, photo and say-or-type tiles, and one-tap
 * re-log chips. Only finished features appear here (barcode is later scope:
 * docs/PRODUCT_BRIEF.md §6). It's a route, so it plays the shared sheet
 * motion itself (useSheetMotion): slide in, then slide out before leaving.
 */
export function AddSheet() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const insets = useSafeAreaInsets();
  const quickAdd = useLog((st) => st.quickAdd);
  const { show, hide, scrimStyle, sheetStyle, onSheetLayout } = useSheetMotion();
  const leaving = useRef(false);

  useEffect(show, [show]);

  /** Slide out, then close the sheet or replace it with the next screen. */
  const leave = (href?: Href) => {
    if (leaving.current) return;
    leaving.current = true;
    hide(() => (href ? router.replace(href) : router.back()));
  };

  // Android back slides the sheet out too.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    return () => sub.remove();
  });

  const tiles: Tile[] = [
    { key: 'photo', icon: 'camera', href: '/camera' },
    { key: 'voice', icon: 'mic', href: '/text-log' },
  ];

  const relog = (id: DishId) => {
    tap();
    quickAdd(id);
    leave();
  };

  return (
    <View style={s.root}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable style={s.scrim} accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => leave()} />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel={t('add.title')}
        onLayout={onSheetLayout}
        style={[s.sheet, { paddingBottom: insets.bottom + theme.space.xxl + SHEET_OVERHANG }, sheetStyle]}>
        <View style={s.handle} />

        {/* Looks like the search field; opens Search with the keyboard up. */}
        <Pressable
          accessibilityRole="search"
          accessibilityLabel={t('search.placeholder')}
          onPress={() => {
            tap();
            leave('/search');
          }}
          style={({ pressed }) => [s.search, pressed && s.pressed]}>
          <Icon name="search" size={20} color={theme.colors.textMuted} />
          <Text variant="body" tone="muted">
            {t('search.placeholder')}
          </Text>
        </Pressable>

        <View style={s.tiles}>
          {tiles.map((tile) => (
            <Pressable
              key={tile.key}
              accessibilityRole="button"
              onPress={() => {
                tap();
                leave(tile.href);
              }}
              style={({ pressed }) => [s.tile, pressed && s.pressed]}>
              <Icon name={tile.icon} size={26} color={theme.colors.onPrimary} />
              <Text variant="bodyStrong" tone="inverse">
                {t(`add.${tile.key}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {quickRelog.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              onPress={() => relog(id)}
              style={({ pressed }) => [s.chip, pressed && s.pressed]}>
              <Image source={dishes[id].photo} style={s.chipPhoto} contentFit="cover" />
              <Text variant="label" hugged>
                {dishes[id].name[language]}
              </Text>
              <Icon name="plus" size={16} strokeWidth={2.2} />
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: theme.colors.scrim },
  sheet: {
    marginBottom: -SHEET_OVERHANG,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    paddingTop: theme.space.md,
    gap: theme.space.xl,
    ...theme.shadow.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.sheetHandle,
  },
  // Same shape as the field on the Search screen.
  search: {
    height: 48,
    marginHorizontal: theme.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  tiles: { flexDirection: 'row', gap: theme.space.sm + 2, paddingHorizontal: theme.gutter },
  tile: {
    flex: 1,
    height: 112,
    padding: theme.space.lg + 2,
    borderRadius: theme.radius.lg,
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
  },
  pressed: { opacity: theme.opacity.pressed },
  chips: { gap: theme.space.sm, paddingHorizontal: theme.gutter },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    height: theme.size.chip + 4,
    paddingLeft: 4,
    paddingRight: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  chipPhoto: { width: 36, height: 36, borderRadius: 18 },
}));
