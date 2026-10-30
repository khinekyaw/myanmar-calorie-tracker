import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { makeStyles, useTheme } from '@/theme/ThemeProvider';

type Props = {
  size?: number;
  /** False when the streak is 0: a still, grey flame. */
  active?: boolean;
};

const OUTER =
  'M12 2.5c.6 3.2 2.6 4.9 4.3 6.9 1.5 1.8 2.7 3.7 2.7 6.3 0 3.9-3.1 6.8-7 6.8s-7-2.9-7-6.8c0-2.6 1.3-4.6 2.9-6.1.3 1.4 1 2.4 2.1 2.9-.4-3.6.4-7.1 2-10z';
const INNER =
  'M12 12c.4 1.9 1.6 2.9 2.4 4 .6.8.9 1.6.9 2.5 0 1.9-1.5 3.3-3.3 3.3s-3.3-1.4-3.3-3.3c0-1.3.6-2.3 1.4-3 .2.7.6 1.1 1.1 1.3-.2-1.7.1-3.4.8-4.8z';

/**
 * Streak fire on Home. Two flame layers that flicker and sway from their base
 * at different speeds, so the motion never looks like a loop. Still when the
 * phone asks for reduced motion.
 */
export function StreakFlame({ size = 18, active = true }: Props) {
  const s = useStyles();
  const theme = useTheme();
  const c = theme.colors.streak;
  const reduceMotion = useReducedMotion();
  const animate = active && !reduceMotion;

  const sway = useSharedValue(0.5);
  const flicker = useSharedValue(0);
  const core = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      sway.value = 0.5;
      flicker.value = 0;
      core.value = 0;
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    sway.value = 0;
    sway.value = withRepeat(withTiming(1, { duration: 1100, easing: ease }), -1, true);
    flicker.value = withRepeat(withTiming(1, { duration: 420, easing: ease }), -1, true);
    core.value = withRepeat(withTiming(1, { duration: 560, easing: ease }), -1, true);
    return () => {
      cancelAnimation(sway);
      cancelAnimation(flicker);
      cancelAnimation(core);
    };
  }, [animate, sway, flicker, core]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${(sway.value - 0.5) * 8}deg` },
      { scaleY: 1 + flicker.value * 0.07 },
      { scaleX: 1 - flicker.value * 0.04 },
    ],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(0.5 - sway.value) * 6}deg` }, { scale: 0.88 + core.value * 0.16 }],
  }));

  const box = { width: size, height: size };
  if (!active) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={OUTER} fill={c.inactive} />
      </Svg>
    );
  }
  return (
    <View style={box}>
      <Animated.View style={[s.layer, box, outerStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <LinearGradient id="flameOuter" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.outerTop} />
              <Stop offset="1" stopColor={c.outerBottom} />
            </LinearGradient>
          </Defs>
          <Path d={OUTER} fill="url(#flameOuter)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[s.layer, box, innerStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <LinearGradient id="flameInner" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.innerTop} />
              <Stop offset="1" stopColor={c.innerBottom} />
            </LinearGradient>
          </Defs>
          <Path d={INNER} fill="url(#flameInner)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  // Flames grow from their base, not their middle.
  layer: { position: 'absolute', left: 0, top: 0, transformOrigin: '50% 92%' },
}));
