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
  /** 'pill' = compact grey pill (Result); 'row' = buttons on surface (lists). Body weights use MeasureInput. */
  variant?: 'pill' | 'row';
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
          variant === 'pill' ? s.buttonOnSurface : s.buttonSurface,
          pressed && s.pressed,
        ]}>
        <Icon
          name={kind}
          size={16}
          strokeWidth={2.4}
          color={enabled ? theme.colors.icon : theme.colors.iconMuted}
        />
      </Pressable>
    );
  };

  return (
    <View style={[s.root, variant === 'pill' && s.pill]}>
      {button('minus')}
      <Text
        variant="numberMd"
        style={[s.value, variant === 'pill' && s.valuePill, value === 0 && s.zero]}
        accessibilityLiveRegion="polite">
        {display}
      </Text>
      {button('plus')}
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  pill: { gap: 2, padding: 3, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface },
  button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  buttonSurface: { backgroundColor: theme.colors.surface },
  buttonOnSurface: { backgroundColor: theme.colors.background, width: 36, height: 36 },
  pressed: { opacity: theme.opacity.pressed },
  value: { minWidth: 40, textAlign: 'center', fontSize: 18 },
  valuePill: { minWidth: 28, fontSize: 15 },
  zero: { color: theme.colors.textSubtle },
}));
