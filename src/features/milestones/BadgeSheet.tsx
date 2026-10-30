import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { BadgeStatus } from '@/domain/badges';
import { formatNumber, formatShortDate } from '@/lib/format';
import { fromDayKey } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, ProgressBar, Text } from '@/ui';

import { BadgeArt, PERCENT } from './BadgeArt';

type Props = { badge: BadgeStatus | null; onClose: () => void };

/** One badge up close: what it takes, and when it was earned or how far along it is. */
export function BadgeSheet({ badge, onClose }: Props) {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const insets = useSafeAreaInsets();
  if (!badge) return null;

  const percent = PERCENT.has(badge.id);
  const fmt = (n: number) => `${formatNumber(n, language)}${percent ? '%' : ''}`;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(150)} style={StyleSheet.absoluteFill}>
        <Pressable style={s.scrim} accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} />
      </Animated.View>
      <View style={s.bottom} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(220)}
          accessibilityViewIsModal
          style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />
          <View style={s.art}>
            <BadgeArt id={badge.id} earned={!!badge.earnedOn} size={148} target={badge.target} />
          </View>
          <View style={s.text}>
            <Text variant="headline" align="center" accessibilityRole="header">
              {t(`milestones.badge.${badge.id}`)}
            </Text>
            <Text variant="body" tone="muted" align="center">
              {t(`milestones.rule.${badge.id}`, { count: badge.target })}
            </Text>
          </View>
          {badge.earnedOn ? (
            <Text variant="label" align="center">
              {t('milestones.earnedOn', { date: formatShortDate(fromDayKey(badge.earnedOn), language) })}
            </Text>
          ) : (
            <View style={s.progress}>
              <View style={s.bar}>
                <ProgressBar value={badge.current / badge.target} />
              </View>
              <Text variant="numberSm" tone="muted">
                {`${fmt(badge.current)} / ${fmt(badge.target)}`}
              </Text>
            </View>
          )}
          <Button variant="ghost" label={t('common.close')} onPress={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  scrim: { flex: 1, backgroundColor: theme.colors.scrim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    paddingHorizontal: theme.gutter,
    paddingTop: theme.space.md,
    gap: theme.space.lg,
    ...theme.shadow.sheet,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.sheetHandle },
  art: { alignItems: 'center', paddingTop: theme.space.sm },
  text: { gap: theme.space.xs },
  progress: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  bar: { flex: 1, flexDirection: 'row' },
}));
