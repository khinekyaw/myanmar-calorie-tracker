import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { tap } from '@/lib/haptics';
import { dishes, quickRelog, type DishId } from '@/mocks/dishes';
import { useLog } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Icon, Text, type IconName } from '@/ui';

type Tile = { key: 'photo' | 'voice' | 'search' | 'barcode'; icon: IconName; primary: boolean; onPress?: () => void };

/** Bottom sheet: four ways to log + one-tap re-log chips. */
export function AddSheet() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const insets = useSafeAreaInsets();
  const quickAdd = useLog((st) => st.quickAdd);

  const tiles: Tile[] = [
    { key: 'photo', icon: 'camera', primary: true, onPress: () => router.replace('/camera') },
    { key: 'voice', icon: 'mic', primary: true, onPress: () => router.replace('/text-log') },
    { key: 'search', icon: 'search', primary: false, onPress: () => router.replace('/search') },
    { key: 'barcode', icon: 'barcode', primary: false, onPress: () => router.replace('/camera') },
  ];

  const relog = (id: DishId) => {
    tap();
    quickAdd(id);
    router.back();
  };

  return (
    <View style={s.root}>
      <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
        <Pressable
          style={s.scrim}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(260)}
        accessibilityViewIsModal
        accessibilityLabel={t('add.title')}
        style={[s.sheet, { paddingBottom: insets.bottom + theme.space.xxl }]}>
        <View style={s.handle} />

        <View style={s.grid}>
          {[tiles.slice(0, 2), tiles.slice(2)].map((row, r) => (
            <View key={r} style={s.gridRow}>
              {row.map((tile) => (
                <Pressable
                  key={tile.key}
                  accessibilityRole="button"
                  onPress={() => {
                    tap();
                    tile.onPress?.();
                  }}
                  style={({ pressed }) => [s.tile, tile.primary ? s.tilePrimary : s.tileSecondary, pressed && s.pressed]}>
                  <Icon name={tile.icon} size={26} color={tile.primary ? theme.colors.onPrimary : theme.colors.icon} />
                  <Text variant="bodyStrong" tone={tile.primary ? 'inverse' : 'default'}>
                    {t(`add.${tile.key}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
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
              <Text variant="label">{dishes[id].name[language]}</Text>
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
  grid: { gap: theme.space.sm + 2, paddingHorizontal: theme.space.lg },
  gridRow: { flexDirection: 'row', gap: theme.space.sm + 2 },
  tile: {
    flex: 1,
    height: 112,
    padding: theme.space.lg + 2,
    borderRadius: theme.radius.lg,
    justifyContent: 'space-between',
  },
  tilePrimary: { backgroundColor: theme.colors.primary },
  tileSecondary: { backgroundColor: theme.colors.surface },
  pressed: { opacity: 0.85 },
  chips: { gap: theme.space.sm, paddingHorizontal: theme.space.lg },
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
