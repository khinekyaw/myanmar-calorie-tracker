import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';

import { Icon, type IconName } from './icons/Icon';
import { Text } from './Text';

/** `light` = white pill for dark backgrounds (camera). */
type Variant = 'primary' | 'secondary' | 'ghost' | 'light';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

/** Pill button, 56px tall. Primary = solid ink. */
export function Button({ label, variant = 'primary', icon, disabled, style, ...rest }: Props) {
  const s = useStyles();
  const inverse = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        s.base,
        s[variant],
        pressed && s.pressed,
        disabled && s.disabled,
        style,
      ]}
      {...rest}>
      {icon && <Icon name={icon} size={20} color={inverse ? s.inverseText.color : undefined} />}
      <Text variant="bodyStrong" tone={inverse ? 'inverse' : 'default'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  base: {
    height: theme.size.button,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surface },
  light: { backgroundColor: theme.colors.background },
  ghost: { backgroundColor: 'transparent', height: 48 },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
  inverseText: { color: theme.colors.onPrimary },
}));
