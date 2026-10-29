import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme/ThemeProvider';

import { Icon, type IconName } from './icons/Icon';
import { Text } from './Text';

type Tone = 'ink' | 'accent' | 'surface' | 'white' | 'onInk';

type Props = {
  label: string;
  tone?: Tone;
  icon?: IconName;
  /** Small colour dot before the label (e.g. BMI category). */
  dot?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Small pill label ("Verified", "Best value", "Closest"). Fixed min height and
 * padding sized for Burmese, which needs more vertical room than Latin.
 */
export function Badge({ label, tone = 'surface', icon, dot, style }: Props) {
  const s = useStyles();
  const theme = useTheme();
  const fg = {
    ink: theme.colors.onPrimary,
    accent: theme.colors.onAccent,
    surface: theme.colors.textMuted,
    white: theme.colors.text,
    onInk: theme.colors.onPrimary,
  }[tone];
  return (
    <View style={[s.base, s[tone], style]}>
      {icon && <Icon name={icon} size={12} strokeWidth={3} color={fg} />}
      {dot && <View style={[s.dot, { backgroundColor: dot }]} />}
      <Text variant="caption" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
    paddingHorizontal: theme.space.md,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  ink: { backgroundColor: theme.colors.selected },
  accent: { backgroundColor: theme.colors.accent },
  surface: { backgroundColor: theme.colors.surface },
  white: { backgroundColor: theme.colors.background },
  onInk: { backgroundColor: theme.colors.onInkSubtle },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
