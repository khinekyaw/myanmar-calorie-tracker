import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles } from '@/theme/ThemeProvider';

/**
 * Bottom sheets reach this far below the screen edge (negative margin, extra
 * padding). Their slide-in overshoots a little; without this, the bounce
 * lifts the sheet's bottom edge off the screen and shows a gap.
 */
export const SHEET_OVERHANG = 48;

/**
 * In: a spring with a small bounce (damping ratio ≈ 0.78, about 2 % overshoot,
 * which SHEET_OVERHANG covers). Out: faster, no bounce.
 */
const SPRING_IN = { damping: 23, stiffness: 220, mass: 1 };
const TIMING_OUT = { duration: 170, easing: Easing.in(Easing.cubic) };

/**
 * Slide-in / slide-out for a bottom sheet and its scrim. `show()` on open;
 * `hide(then)` plays the exit and calls `then` when it's done (unmount,
 * navigate). Put `onSheetLayout` on the sheet: it travels its own height, so
 * it appears at once instead of crossing the screen. Used by BottomSheet and
 * the AddSheet route.
 */
export function useSheetMotion() {
  const { height } = useWindowDimensions();
  const progress = useSharedValue(0);
  // The window height until the sheet has measured itself (hidden either way).
  const travel = useSharedValue(height);
  const onSheetLayout = useCallback((e: LayoutChangeEvent) => travel.set(e.nativeEvent.layout.height), [travel]);

  const show = useCallback(() => {
    progress.set(withSpring(1, SPRING_IN));
  }, [progress]);

  const hide = useCallback(
    (then?: () => void) => {
      progress.set(
        withTiming(0, TIMING_OUT, (finished) => {
          if (finished && then) scheduleOnRN(then);
        }),
      );
    },
    [progress],
  );

  const scrimStyle = useAnimatedStyle(() => ({ opacity: Math.min(progress.get(), 1) }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * travel.get() }] }));

  return { show, hide, scrimStyle, sheetStyle, onSheetLayout };
}

type Props = {
  visible: boolean;
  /** Scrim tap or the back button. The parent then sets `visible` to false. */
  onClose: () => void;
  /** Spoken label for the scrim. */
  closeLabel: string;
  children: ReactNode;
  /** Gap and side padding for the content (the sheet adds top/bottom). */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * A bottom sheet in a modal: white, rounded top, handle, scrim. It slides in
 * when `visible` turns true and slides out (faster) when it turns false,
 * staying mounted until the exit has played.
 */
export function BottomSheet({ visible, onClose, closeLabel, children, contentStyle }: Props) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { show, hide, scrimStyle, sheetStyle, onSheetLayout } = useSheetMotion();
  const [mounted, setMounted] = useState(visible);

  // Mount as soon as it should show (state adjusted during render, not in an effect).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) show();
    else hide(() => setMounted(false));
  }, [visible, show, hide]);

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable style={s.scrim} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} />
      </Animated.View>
      <View style={s.bottom} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          onLayout={onSheetLayout}
          style={[s.sheet, { paddingBottom: insets.bottom + 16 + SHEET_OVERHANG }, sheetStyle]}>
          <View style={s.handle} />
          <View style={[s.content, contentStyle]}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  scrim: { flex: 1, backgroundColor: theme.colors.scrim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    marginBottom: -SHEET_OVERHANG,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    paddingTop: theme.space.md,
    gap: theme.space.xl,
    ...theme.shadow.sheet,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.sheetHandle },
  content: { paddingHorizontal: theme.gutter },
}));
