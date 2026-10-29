import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { tap } from '@/lib/haptics';
import { makeStyles } from '@/theme/ThemeProvider';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
};

const W = 48;
const H = 28;
const KNOB = 22;
const PAD = 3;

/** Monochrome switch (ink when on). The platform switch is too colourful for the design. */
export function Switch({ value, onValueChange, accessibilityLabel }: Props) {
  const s = useStyles();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 160 });
  }, [value, progress]);

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (W - KNOB - PAD * 2) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        tap();
        onValueChange(!value);
      }}
      style={[s.track, value ? s.on : s.off]}>
      <Animated.View style={[s.knob, knob]} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  track: { width: W, height: H, borderRadius: H / 2, padding: PAD, justifyContent: 'center' },
  on: { backgroundColor: theme.colors.selected },
  off: { backgroundColor: theme.colors.switchOff },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: theme.colors.background },
}));
