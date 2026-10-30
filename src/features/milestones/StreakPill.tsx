import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/lib/format';
import { useStreak } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { StreakFlame, Text } from '@/ui';

/** Fire + streak count (Home, Progress). Opens Milestones. */
export function StreakPill() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const streak = useStreak();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.streak', { count: streak })}
      accessibilityHint={t('milestones.open')}
      hitSlop={4}
      onPress={() => router.push('/milestones')}
      style={({ pressed }) => [s.pill, pressed && s.pressed]}>
      <StreakFlame size={20} active={streak > 0} />
      <Text variant="numberSm">{formatNumber(streak, language)}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    height: 36,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: theme.opacity.pressed },
}));
