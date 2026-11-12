import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';

import { Icon, type IconName } from './icons/Icon';
import { Text } from './Text';

/** `light` = white pill for dark backgrounds (camera). */
type Variant = 'primary' | 'secondary' | 'ghost' | 'light';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  icon?: IconName;
  /** Custom mark before the label (e.g. the Google logo), instead of `icon`. */
  leading?: ReactNode;
  /** 'md' = 56px main action; 'sm' = 40px inline action inside a card. */
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  /** Waiting on this button's action: a spinner replaces the label and presses are ignored. */
  loading?: boolean;
};

/** Pill button. Primary = solid ink. */
export function Button({
  label,
  variant = 'primary',
  icon,
  leading,
  size = 'md',
  disabled,
  loading,
  style,
  ...rest
}: Props) {
  const s = useStyles();
  const inverse = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.base,
        s[variant],
        size === 'sm' && s.sm,
        pressed && s.pressed,
        disabled && !loading && s.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={inverse ? s.inverseText.color : s.text.color} />
      ) : (
        <>
          {leading}
          {icon && <Icon name={icon} size={20} color={inverse ? s.inverseText.color : undefined} />}
          <Text
            variant={size === 'sm' ? 'label' : 'bodyStrong'}
            tone={inverse ? 'inverse' : 'default'}
            numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
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
  sm: { height: theme.size.buttonSm, paddingHorizontal: theme.space.lg },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
  inverseText: { color: theme.colors.onPrimary },
  text: { color: theme.colors.text },
}));
