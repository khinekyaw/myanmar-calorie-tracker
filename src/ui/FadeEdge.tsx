import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { makeStyles, useTheme } from '@/theme/ThemeProvider';

type Props = {
  /** Which edge of the scrolling area it sits on. */
  edge?: 'top' | 'bottom';
  height?: number;
};

/**
 * Background-coloured fade over the edge of a scrolling list where it meets
 * a fixed section (a header, a chip row), so content fades out instead of
 * being cut off. Put it last inside a wrapper around the list; it doesn't
 * take touches (docs/ARCHITECTURE.md → "Design rules").
 */
export function FadeEdge({ edge = 'top', height }: Props) {
  const s = useStyles();
  const theme = useTheme();
  // SVG ids must be unique on screen and can't contain the colons useId adds.
  const id = `fade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const top = edge === 'top';
  return (
    <View style={[s.fade, top ? s.top : s.bottom, { height: height ?? theme.space.xxl }]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1={top ? 0 : 1} x2="0" y2={top ? 1 : 0}>
            <Stop offset="0" stopColor={theme.colors.background} stopOpacity={1} />
            <Stop offset="1" stopColor={theme.colors.background} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  fade: { position: 'absolute', left: 0, right: 0, pointerEvents: 'none' },
  top: { top: 0 },
  bottom: { bottom: 0 },
}));
