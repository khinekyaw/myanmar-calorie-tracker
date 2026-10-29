import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';

import { Icon, type IconName } from './icons/Icon';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  icon: IconName;
  /** Required: icon-only buttons need a spoken label. */
  accessibilityLabel: string;
  variant?: 'surface' | 'onDark';
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Round 44px icon button (back, close, flash…). */
export function IconButton({ icon, variant = 'surface', size, style, ...rest }: Props) {
  const s = useStyles();
  const dim = size ?? s.base.width;
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      style={({ pressed }) => [
        s.base,
        variant === 'onDark' ? s.onDark : s.surface,
        { width: dim, height: dim, borderRadius: dim / 2 },
        pressed && s.pressed,
        style,
      ]}
      {...rest}>
      <Icon name={icon} size={20} strokeWidth={2} color={variant === 'onDark' ? s.onDarkIcon.color : undefined} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  base: {
    width: theme.size.iconButton,
    height: theme.size.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: { backgroundColor: theme.colors.surface },
  onDark: { backgroundColor: theme.colors.camera.control },
  pressed: { opacity: theme.opacity.pressed },
  onDarkIcon: { color: theme.colors.camera.foreground },
}));
