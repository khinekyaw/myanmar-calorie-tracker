import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { makeStyles, useTheme } from '@/theme/ThemeProvider';

// Everything is drawn in a 100×100 box around the centre (50, 50).
const C = 50;
const at = (r: number, deg: number, cx = C, cy = C) => {
  const a = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
};
const poly = (pts: string[]) => `M${pts.join('L')}Z`;

/** Outer ring: a zigzag of triangles between the rim and the inner band, like a cut gem. */
const RING = (() => {
  const n = 16;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (360 / n) * i - 90;
    const a1 = a0 + 360 / n;
    const mid = (a0 + a1) / 2;
    out.push(poly([at(47, a0), at(47, a1), at(37, mid)]));
    out.push(poly([at(37, mid), at(37, mid + 360 / n), at(47, a1)]));
  }
  return out;
})();

/** Inner face: triangles fanning out from a point just above centre. */
const FACE = (() => {
  const n = 12;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (360 / n) * i - 75;
    out.push(poly([`${C - 2} ${C - 4}`, at(35, a0), at(35, a0 + 360 / n)]));
  }
  return out;
})();

/** Five-point star with its outer and inner points. */
function starPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => at(i % 2 ? r * 0.45 : r, 36 * i - 90, cx, cy));
}
const STAR = starPoints(C, C + 1, 17);
/** Lighter half of each star point, for a cut look. */
const STAR_FACETS = Array.from({ length: 5 }, (_, i) => poly([`${C} ${C + 1}`, STAR[i * 2], STAR[(i * 2 + 1) % 10]]));

const sparkle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;

type Props = { size: number; active: boolean };

/**
 * "Badges earned": a holographic coin with a star, drawn in code.
 * A soft shine sweeps across it every few seconds and a sparkle twinkles.
 * Grey and still before the first badge; still with reduced motion.
 */
export function DiamondBadge({ size, active }: Props) {
  const s = useStyles();
  const h = useTheme().colors.holo;
  const reduceMotion = useReducedMotion();
  const animate = active && !reduceMotion;

  const sweep = useSharedValue(0);
  const twinkle = useSharedValue(1);

  useEffect(() => {
    if (!animate) {
      sweep.value = 0;
      twinkle.value = 1;
      return;
    }
    const ease = Easing.inOut(Easing.quad);
    sweep.value = 0;
    sweep.value = withRepeat(withDelay(1800, withTiming(1, { duration: 1300, easing: ease })), -1, false);
    twinkle.value = withRepeat(
      withSequence(withTiming(0.15, { duration: 900, easing: ease }), withTiming(1, { duration: 900, easing: ease })),
      -1,
    );
    return () => {
      cancelAnimation(sweep);
      cancelAnimation(twinkle);
    };
  }, [animate, sweep, twinkle]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (sweep.value * 2.2 - 1.1) * size }, { rotate: '20deg' }],
  }));
  const twinkleStyle = useAnimatedStyle(() => ({ opacity: twinkle.value, transform: [{ scale: 0.6 + twinkle.value * 0.4 }] }));

  const box = { width: size, height: size };
  return (
    <View style={[box, !active && s.locked]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="soft" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={h.base} stopOpacity={0.45} />
            <Stop offset="0.5" stopColor={h.base} stopOpacity={0.05} />
            <Stop offset="1" stopColor={h.base} stopOpacity={0.25} />
          </LinearGradient>
        </Defs>
        <Circle cx={C} cy={C} r={47} fill={h.base} />
        {RING.map((d, i) => (
          <Path key={`r${i}`} d={d} fill={h.facets[(i * 5) % h.facets.length]} />
        ))}
        {FACE.map((d, i) => (
          <Path key={`f${i}`} d={d} fill={h.facets[(i * 2 + 1) % h.facets.length]} opacity={0.85} />
        ))}
        <Circle cx={C} cy={C} r={47} fill="url(#soft)" />
        <Circle cx={C} cy={C} r={46.3} fill="none" stroke={h.base} strokeWidth={1.2} opacity={0.8} />
        <Circle cx={C} cy={C} r={47.4} fill="none" stroke={h.rim} strokeWidth={1.2} />
        <Circle cx={C} cy={C} r={37} fill="none" stroke={h.rim} strokeWidth={2.6} />
        <Circle cx={C} cy={C} r={35.4} fill="none" stroke={h.base} strokeWidth={1} opacity={0.9} />
        <G>
          <Path d={poly(STAR)} fill={h.emblem} stroke={h.edge} strokeWidth={0.8} strokeLinejoin="round" />
          {STAR_FACETS.map((d, i) => (
            <Path key={`s${i}`} d={d} fill={h.emblemLight} />
          ))}
        </G>
      </Svg>

      {/* Shine: a soft white band sweeping across, clipped to the coin. */}
      <View style={[s.clip, { borderRadius: size / 2 }]} pointerEvents="none">
        <Animated.View style={[s.band, { width: size * 0.32, height: size * 1.6, top: -size * 0.3, left: size * 0.34 }, sweepStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 10 10" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="band" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={h.shine} stopOpacity={0} />
                <Stop offset="0.5" stopColor={h.shine} stopOpacity={0.55} />
                <Stop offset="1" stopColor={h.shine} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d="M0 0H10V10H0Z" fill="url(#band)" />
          </Svg>
        </Animated.View>
      </View>

      <Animated.View style={[s.layer, box, { transformOrigin: '80% 18%' }, twinkleStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path d={sparkle(80, 18, 6)} fill={h.shine} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  layer: { position: 'absolute', left: 0, top: 0 },
  clip: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden' },
  band: { position: 'absolute' },
  locked: { filter: [{ grayscale: 1 }], opacity: theme.opacity.disabled },
}));
