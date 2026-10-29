import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { tap } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

import { Icon, type IconName } from './icons/Icon';
import { Text } from './Text';

type Props = {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  /** Toggle chips: selected = solid ink. Omit for plain action chips. */
  selected?: boolean;
  /** 'outline' = hairline border on white (health toggles); 'fill' = grey surface. */
  look?: 'outline' | 'fill';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** 40px pill chip, used for toggles (sides, health flags, sweetness) and small actions. */
export function Chip({ label, icon, onPress, selected, look = 'fill', accessibilityLabel, style }: Props) {
  const s = useStyles();
  const theme = useTheme();
  const isToggle = selected !== undefined;
  const fg = selected ? theme.colors.onSelected : theme.colors.text;
  return (
    <Pressable
      accessibilityRole={isToggle ? 'checkbox' : 'button'}
      accessibilityState={isToggle ? { checked: selected } : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        s.base,
        look === 'outline' ? s.outline : s.fill,
        selected && s.selected,
        pressed && s.pressed,
        style,
      ]}>
      {icon && <Icon name={icon} size={16} strokeWidth={2.2} color={fg} />}
      {label && (
        <Text variant="label" color={fg}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  base: {
    minHeight: theme.size.chip,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fill: { backgroundColor: theme.colors.surface },
  outline: { backgroundColor: theme.colors.background, borderWidth: 1.5, borderColor: theme.colors.surfaceStrong },
  selected: { backgroundColor: theme.colors.selected, borderColor: theme.colors.selected },
  pressed: { opacity: 0.7 },
}));
