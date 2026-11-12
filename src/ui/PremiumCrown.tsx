import Svg, { Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Small gold crown marking a Premium feature for people without a pass
 * (docs/DECISIONS.md → "Gold crown on Premium features"). Decorative: the
 * row or chip it sits in says "Premium" to screen readers.
 */
export function PremiumCrown({ size = 16 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no">
      <Path
        d="M3.2 8.6a1 1 0 0 1 1.6-.9l3.7 3 2.6-4.8a1 1 0 0 1 1.8 0l2.6 4.8 3.7-3a1 1 0 0 1 1.6.9l-1.5 8.6a1.5 1.5 0 0 1-1.5 1.3H6.2a1.5 1.5 0 0 1-1.5-1.3z"
        fill={theme.colors.accent}
      />
      <Rect x={5.5} y={19.6} width={13} height={1.9} rx={0.95} fill={theme.colors.accent} />
    </Svg>
  );
}
