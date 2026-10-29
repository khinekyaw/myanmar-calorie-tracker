import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { tap } from '@/lib/haptics';
import { makeStyles } from '@/theme/ThemeProvider';

import { Icon, type IconName } from './icons/Icon';
import { Text } from './Text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  /** 'row' = icon + label left-aligned; 'center' = label centred (segmented). */
  layout?: 'row' | 'center';
  style?: StyleProp<ViewStyle>;
};

/** Selectable option. Selected = solid ink with white text; otherwise surface grey. */
export function OptionCard({ label, selected, onPress, icon, layout = 'row', style }: Props) {
  const s = useStyles();
  const fg = selected ? s.selectedText.color : s.text.color;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        s.base,
        layout === 'center' ? s.center : s.row,
        selected ? s.selected : s.idle,
        pressed && !selected && s.pressed,
        style,
      ]}>
      {icon && (
        <View style={[s.iconWrap, selected && s.iconWrapSelected]}>
          <Icon name={icon} size={22} color={fg} />
        </View>
      )}
      <Text variant={selected ? 'bodyStrong' : 'body'} color={fg} style={layout === 'row' && s.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  base: {
    minHeight: theme.size.option,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: { minHeight: theme.size.optionLg, gap: theme.space.lg, paddingHorizontal: theme.space.md },
  center: { justifyContent: 'center' },
  idle: { backgroundColor: theme.colors.surface },
  selected: { backgroundColor: theme.colors.selected },
  pressed: { backgroundColor: theme.colors.surfaceStrong },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: { backgroundColor: 'rgba(255,255,255,0.12)' },
  label: { flex: 1, paddingVertical: theme.space.md },
  text: { color: theme.colors.text },
  selectedText: { color: theme.colors.onSelected },
}));
