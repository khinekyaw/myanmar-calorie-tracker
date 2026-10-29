import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

type Props = { values: number[]; height?: number; accessibilityLabel: string };

/** Smooth monotone line with a soft fill and an end dot. Pure SVG — no chart library. */
export function LineChart({ values, height = 150, accessibilityLabel }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const pad = 8;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: pad + (i * (width - pad * 2)) / Math.max(values.length - 1, 1),
    y: pad + ((max - v) / range) * (height - pad * 2 - 16),
  }));

  // Catmull-Rom → cubic Bézier for a gentle curve.
  const line = pts.reduce((d, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const p0 = pts[i - 2] ?? pts[i - 1];
    const p1 = pts[i - 1];
    const p2 = p;
    const p3 = pts[i + 1] ?? p;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    return `${d} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }, '');
  const last = pts[pts.length - 1];
  const area = last ? `${line} L${last.x},${height} L${pts[0].x},${height} Z` : '';

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.primary} stopOpacity={0.06} />
              <Stop offset="1" stopColor={theme.colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0.15, 0.5, 0.85].map((f) => (
            <Line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={theme.colors.surfaceStrong} strokeWidth={1} />
          ))}
          <Path d={area} fill="url(#fill)" />
          <Path d={line} fill="none" stroke={theme.colors.primary} strokeWidth={2.5} strokeLinecap="round" />
          {last && (
            <>
              <Circle cx={last.x} cy={last.y} r={8} fill={theme.colors.background} />
              <Circle cx={last.x} cy={last.y} r={5} fill={theme.colors.primary} />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}
