import { Pressable } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

type Props = { label: string; kcal: string; onPress: () => void; disabled?: boolean };

/** Primary pill with the action on the left and the kcal total on the right ("Save · 690"). */
export function SaveBar({ label, kcal, onPress, disabled }: Props) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${kcal}`}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.bar, pressed && s.pressed, disabled && s.disabled]}>
      <Text variant="bodyStrong" tone="inverse">
        {label}
      </Text>
      <Text variant="numberSm" tone="inverse" style={s.kcal}>
        {kcal}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  bar: {
    height: theme.size.button,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.xxl,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.35 },
  kcal: { fontSize: 17 },
}));
