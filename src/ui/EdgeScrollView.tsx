import { ScrollView, type ScrollViewProps } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';

/**
 * A horizontal scroll row inside a padded screen (chips, cards). It runs to
 * the screen edges, so items scroll past the gutter instead of being cut off
 * at it, and starts and ends aligned with the gutter (docs/ARCHITECTURE.md →
 * "Design rules").
 */
export function EdgeScrollView({ style, contentContainerStyle, ...rest }: ScrollViewProps) {
  const s = useStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      {...rest}
      style={[s.bleed, style]}
      contentContainerStyle={[s.content, contentContainerStyle]}
    />
  );
}

const useStyles = makeStyles(({ theme }) => ({
  // Never grow or shrink: in a column next to a list, a ScrollView would otherwise
  // be squeezed and cut its items off at the bottom.
  bleed: { flexGrow: 0, flexShrink: 0, marginHorizontal: -theme.gutter },
  content: { paddingHorizontal: theme.gutter },
}));
