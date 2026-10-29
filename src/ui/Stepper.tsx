import { Pressable, View } from 'react-native';

import { tap } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

import { Icon } from './icons/Icon';
import { Text } from './Text';

type Props = {
  value: number;
  onChange: (value: number) => void;
  /** Formatted value ("1½", "125"). */
  display: string;
  step?: number;
  min?: number;
  max?: number;
  /** Spoken labels for − and +. */
  decreaseLabel: string;
  increaseLabel: string;
  /** 'pill' = compact grey pill (Result); 'row' = buttons on surface (lists); 'large' = big number (target weight). */
  variant?: 'pill' | 'row' | 'large';
  /** Unit after a large number ("lb"). */
  unit?: string;
};

/** − value + control. Buttons stay ≥ 36px, with a hit slop to 44px. */
export function Stepper({
  value,
  onChange,
  display,
  step = 1,
  min = 0,
  max = 999,
  decreaseLabel,
  increaseLabel,
  variant = 'row',
  unit,
}: Props) {
  const s = useStyles();
  const theme = useTheme();
  const canDec = value - step >= min - 1e-9;
  const canInc = value + step <= max + 1e-9;
  const change = (next: number) => {
    tap();
    onChange(Math.round(next * 100) / 100);
  };

  const button = (kind: 'minus' | 'plus') => {
    const enabled = kind === 'minus' ? canDec : canInc;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={kind === 'minus' ? decreaseLabel : increaseLabel}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        hitSlop={6}
        onPress={() => change(kind === 'minus' ? value - step : value + step)}
        style={({ pressed }) => [
          s.button,
          variant === 'large' && s.buttonLarge,
          variant === 'pill' ? s.buttonOnSurface : s.buttonSurface,
          pressed && s.pressed,
        ]}>
        <Icon
          name={kind}
          size={variant === 'large' ? 20 : 16}
          strokeWidth={2.4}
          color={enabled ? theme.colors.icon : theme.colors.iconMuted}
        />
      </Pressable>
    );
  };

  return (
    <View style={[s.root, variant === 'pill' && s.pill, variant === 'large' && s.large]}>
      {button('minus')}
      {variant === 'large' ? (
        <View style={s.largeValue} accessibilityLiveRegion="polite">
          <Text variant="display" style={s.largeNumber}>
            {display}
          </Text>
          {unit && (
            <Text variant="body" tone="muted">
              {unit}
            </Text>
          )}
        </View>
      ) : (
        <Text
          variant="numberMd"
          style={[s.value, variant === 'pill' && s.valuePill, value === 0 && s.zero]}
          accessibilityLiveRegion="polite">
          {display}
        </Text>
      )}
      {button('plus')}
    </View>
  );
}

const useStyles = makeStyles(({ theme, type }) => ({
  root: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  pill: { gap: 2, padding: 3, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface },
  large: { gap: theme.space.xxl },
  button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  buttonLarge: { width: 52, height: 52, borderRadius: 26 },
  buttonSurface: { backgroundColor: theme.colors.surface },
  buttonOnSurface: { backgroundColor: theme.colors.background, width: 36, height: 36 },
  pressed: { opacity: 0.6 },
  value: { minWidth: 40, textAlign: 'center', fontSize: 18 },
  valuePill: { minWidth: 28, fontSize: 15 },
  zero: { color: theme.colors.textSubtle },
  largeValue: { flexDirection: 'row', alignItems: 'baseline', gap: theme.space.xs, minWidth: 120, justifyContent: 'center' },
  largeNumber: { ...type.numberXl, fontSize: 60, lineHeight: 68, letterSpacing: -2 },
}));
