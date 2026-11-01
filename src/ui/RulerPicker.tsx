import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { tap } from '@/lib/haptics';
import { makeStyles } from '@/theme/ThemeProvider';

import { Text } from './Text';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** Value resolution (0.1 lb). */
  step?: number;
  /** Distance between small ticks, in value units (1 lb, 0.25 in). */
  tick?: number;
  /** A labelled long tick every `major` units (10 lb, 1 in). */
  major?: number;
  /** Pixels between small ticks. */
  tickSpacing?: number;
  formatLabel: (v: number) => string;
  accessibilityLabel: string;
  /** Spoken value, e.g. "131.2 lb". */
  accessibilityValueText: string;
};

const round = (v: number, step: number) => Math.round(v / step) * step;

/**
 * Horizontal ruler: drag to change a value; the centre line marks it.
 * Whole units tick with haptics. Screen readers get increment/decrement.
 */
export function RulerPicker({
  value,
  onChange,
  min,
  max,
  step = 0.1,
  tick = 1,
  major = 10,
  tickSpacing = 12,
  formatLabel,
  accessibilityLabel,
  accessibilityValueText,
}: Props) {
  const s = useStyles();
  const scroll = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const lastEmitted = useRef(value);
  const lastWhole = useRef(Math.floor(value));
  const pxPerUnit = tickSpacing / tick;

  const clamp = (v: number) => Math.min(Math.max(v, min), max);
  const xFor = (v: number) => (clamp(v) - min) * pxPerUnit;

  // Follow outside changes (typed number, other control) without fighting the user's drag.
  useEffect(() => {
    if (width && Math.abs(value - lastEmitted.current) > step / 2) {
      lastEmitted.current = value;
      scroll.current?.scrollTo({ x: xFor(value), animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const v = clamp(Number(round(min + e.nativeEvent.contentOffset.x / pxPerUnit, step).toFixed(2)));
    if (Math.abs(v - lastEmitted.current) < step / 2) return;
    lastEmitted.current = v;
    if (Math.floor(v) !== lastWhole.current) {
      lastWhole.current = Math.floor(v);
      tap();
    }
    onChange(v);
  };

  const count = Math.round((max - min) / tick);
  const ticks = Array.from({ length: count + 1 }, (_, i) => min + i * tick);
  const isMajor = (v: number) => Math.abs(v / major - Math.round(v / major)) < 1e-6;
  const isMid = (v: number) => Math.abs(v / (major / 2) - Math.round(v / (major / 2))) < 1e-6;

  return (
    <View
      style={s.root}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: accessibilityValueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        onChange(clamp(round(value + (e.nativeEvent.actionName === 'increment' ? tick : -tick), step)))
      }>
      {width > 0 && (
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          onScroll={onScroll}
          onLayout={() => scroll.current?.scrollTo({ x: xFor(value), animated: false })}
          contentContainerStyle={{ paddingHorizontal: width / 2 }}>
          <View style={[s.track, { width: count * tickSpacing }]}>
            {ticks.map((v, i) => (
              <View key={i} style={[s.tickSlot, { left: i * tickSpacing }]}>
                <View style={[s.tick, isMajor(v) ? s.tickMajor : isMid(v) ? s.tickMid : s.tickMinor]} />
                {isMajor(v) && (
                  <Text variant="caption" tone="subtle" style={s.label}>
                    {formatLabel(v)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      <View pointerEvents="none" style={s.indicator} />
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  // Runs past the gutter to the screen edges so ticks aren't cut off at the padding.
  root: { alignSelf: 'stretch', marginHorizontal: -theme.gutter, height: 84, justifyContent: 'center' },
  track: { height: 84 },
  tickSlot: { position: 'absolute', top: 8, width: 1, alignItems: 'center' },
  tick: { width: 2, borderRadius: 1, backgroundColor: theme.colors.switchOff },
  tickMinor: { height: 18 },
  tickMid: { height: 28 },
  tickMajor: { height: 38, backgroundColor: theme.colors.iconMuted },
  label: { position: 'absolute', top: 44, left: -24, width: 48, textAlign: 'center', fontSize: 12 },
  indicator: {
    position: 'absolute',
    alignSelf: 'center',
    top: 0,
    width: 4,
    height: 52,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
}));
