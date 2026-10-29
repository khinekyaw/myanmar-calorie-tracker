import { router } from 'expo-router';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/lib/haptics';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Icon, type IconName } from '@/ui';

const FAB_GAP = 18;

export const useTabBarStyles = () => {
  const base = useStyles();
  const insets = useSafeAreaInsets();
  return {
    ...base,
    bar: [base.bar, { paddingBottom: insets.bottom, height: base.bar.height + insets.bottom }],
    fab: [base.fab, { bottom: insets.bottom + FAB_GAP + 8 }],
  };
};

type ButtonProps = TabTriggerSlotProps & { icon: IconName; label: string };

export function TabBarButton({ icon, label, isFocused, ref, ...props }: ButtonProps) {
  const s = useStyles();
  const { theme } = useStyleContext();
  return (
    <Pressable
      {...props}
      // expo-router types the slot ref as View; RN 0.88's Pressable wants its element type.
      ref={ref as never}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={s.tab}>
      <Icon
        name={icon}
        size={24}
        strokeWidth={isFocused ? 2.4 : 2}
        filled={isFocused && icon === 'home'}
        color={isFocused ? theme.colors.icon : theme.colors.iconMuted}
      />
    </Pressable>
  );
}

export function AddButton({ label }: { label: string }) {
  const { fab } = useTabBarStyles();
  const { theme } = useStyleContext();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        router.push('/add');
      }}
      style={({ pressed }) => [fab, pressed && { transform: [{ scale: 0.96 }] }]}>
      <Icon name="plus" size={26} strokeWidth={2.4} color={theme.colors.onPrimary} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  bar: {
    height: theme.size.tabBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.space.sm,
    // Leave room on the right for the floating + button.
    paddingRight: theme.size.fab + FAB_GAP + theme.space.sm,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
  },
  tab: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: FAB_GAP,
    width: theme.size.fab,
    height: theme.size.fab,
    borderRadius: theme.size.fab / 2,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.floating,
  },
}));
