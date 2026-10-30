import { useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { axisTicks } from '@/domain/progress';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

export type ChartPoint = { date: Date; value: number };

type Props = {
  points: ChartPoint[];
  /** Dashed horizontal goal line. */
  goal?: number;
  goalLabel?: string;
  formatValue: (v: number) => string;
  formatDate: (d: Date) => string;
  accessibilityLabel: string;
  height?: number;
};

/** Width of a digit and of a "." in the 11px y labels (Inter, equal-width digits), and the gap to the plot. */
const DIGIT_W = 6.5;
const DOT_W = 3;
const AXIS_GAP = 6;
const labelWidth = (label: string) => [...label].reduce((w, ch) => w + (ch === '.' ? DOT_W : DIGIT_W), 0);
const PAD_R = 10;
const PAD_T = 34; // room for the value bubble
const PAD_B = 24; // x labels

/**
 * Weight / waist line chart: y-axis ticks, date labels, dashed goal line,
 * point markers, and a value bubble that follows your finger (tap or drag).
 * Pure SVG + Text overlays — no chart library.
 */
export function LineChart({ points, goal, goalLabel, formatValue, formatDate, accessibilityLabel, height = 210 }: Props) {
  const theme = useTheme();
  const s = useStyles();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked !== null && picked < points.length ? picked : points.length - 1;

  if (points.length === 0) return null;

  const values = points.map((p) => p.value).concat(goal !== undefined ? [goal] : []);
  const ticks = axisTicks(Math.min(...values), Math.max(...values));
  // The label column is only as wide as the longest label, so the plot sits nearer the middle.
  const tickLabels = ticks.map(formatValue);
  const axisW = Math.ceil(Math.max(...tickLabels.map(labelWidth))) + AXIS_GAP;
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const plotW = Math.max(width - axisW - PAD_R, 1);
  const plotH = height - PAD_T - PAD_B;
  const t0 = points[0].date.getTime();
  const span = Math.max(points[points.length - 1].date.getTime() - t0, 1);

  const x = (d: Date) => axisW + ((d.getTime() - t0) / span) * plotW;
  const y = (v: number) => PAD_T + ((hi - v) / (hi - lo || 1)) * plotH;
  const pts = points.map((p) => ({ x: points.length === 1 ? axisW + plotW / 2 : x(p.date), y: y(p.value) }));

  // Catmull-Rom → cubic Bézier for a gentle curve.
  const line = pts.reduce((d, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const p0 = pts[i - 2] ?? pts[i - 1];
    const p1 = pts[i - 1];
    const p3 = pts[i + 1] ?? p;
    const c1 = { x: p1.x + (p.x - p0.x) / 6, y: p1.y + (p.y - p0.y) / 6 };
    const c2 = { x: p.x - (p3.x - p1.x) / 6, y: p.y - (p3.y - p1.y) / 6 };
    return `${d} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p.x},${p.y}`;
  }, '');
  const area = `${line} L${pts[pts.length - 1].x},${PAD_T + plotH} L${pts[0].x},${PAD_T + plotH} Z`;

  const pickAt = (e: GestureResponderEvent) => {
    const lx = e.nativeEvent.locationX;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.x - lx) < Math.abs(pts[best].x - lx)) best = i;
    });
    setPicked(best);
  };

  const sel = pts[selected];
  const bubbleW = 92;
  const bubbleLeft = Math.min(Math.max(sel.x - bubbleW / 2, axisW - 8), width - bubbleW);
  const xLabels = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);
  const showDots = points.length <= 20;

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={pickAt}
      onResponderMove={pickAt}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 && (
        <>
          <Svg width={width} height={height} style={s.abs}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.colors.primary} stopOpacity={0.1} />
                <Stop offset="1" stopColor={theme.colors.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ticks.map((v) => (
              <Line
                key={v}
                x1={axisW}
                x2={width - PAD_R}
                y1={y(v)}
                y2={y(v)}
                stroke={theme.colors.surfaceStrong}
                strokeWidth={1}
              />
            ))}
            {goal !== undefined && (
              <Line
                x1={axisW}
                x2={width - PAD_R}
                y1={y(goal)}
                y2={y(goal)}
                stroke={theme.colors.textMuted}
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />
            )}
            <Path d={area} fill="url(#fill)" />
            <Path d={line} fill="none" stroke={theme.colors.primary} strokeWidth={2.5} strokeLinecap="round" />
            <Line x1={sel.x} x2={sel.x} y1={sel.y} y2={PAD_T + plotH} stroke={theme.colors.textSubtle} strokeWidth={1} strokeDasharray="3 4" />
            {showDots &&
              pts.map((p, i) =>
                i === selected ? null : (
                  <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={theme.colors.surface} stroke={theme.colors.primary} strokeWidth={1.5} />
                ),
              )}
            <Circle cx={sel.x} cy={sel.y} r={8} fill={theme.colors.background} />
            <Circle cx={sel.x} cy={sel.y} r={5} fill={theme.colors.primary} />
          </Svg>

          {ticks.map((v, i) => (
            <Text key={v} variant="caption" tone="subtle" style={[s.yLabel, { top: y(v) - 9, width: axisW - AXIS_GAP }]}>
              {tickLabels[i]}
            </Text>
          ))}

          {goal !== undefined && goalLabel && (
            <View style={[s.goalTag, { top: y(goal) - 22 }]}>
              <Text variant="caption" tone="muted">
                {goalLabel}
              </Text>
            </View>
          )}

          {xLabels.map((i) => (
            <Text
              key={i}
              variant="caption"
              tone={i === selected ? 'default' : 'subtle'}
              style={[s.xLabel, { left: Math.min(Math.max(pts[i].x - 30, 0), width - 60) }]}>
              {formatDate(points[i].date)}
            </Text>
          ))}

          <View style={[s.bubble, { left: bubbleLeft, top: Math.max(sel.y - 40, 0), width: bubbleW }]}>
            <Text variant="numberSm" tone="inverse" align="center" style={s.bubbleText}>
              {formatValue(points[selected].value)}
            </Text>
            <Text variant="caption" tone="inverse" align="center" style={s.bubbleDate}>
              {formatDate(points[selected].date)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  abs: { position: 'absolute', top: 0, left: 0 },
  yLabel: { position: 'absolute', left: 0, fontSize: 11, lineHeight: 18 },
  xLabel: { position: 'absolute', bottom: 0, width: 60, textAlign: 'center', fontSize: 11, lineHeight: 18 },
  goalTag: { position: 'absolute', right: PAD_R },
  bubble: {
    position: 'absolute',
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
  },
  bubbleText: { fontSize: 13, lineHeight: 16 },
  bubbleDate: { fontSize: 10, lineHeight: 13, opacity: 0.75 },
}));
