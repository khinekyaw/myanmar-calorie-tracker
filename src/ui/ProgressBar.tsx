import { View } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';

/** Thin onboarding progress bar. `value` is 0–1. */
export function ProgressBar({ value }: { value: number }) {
  const s = useStyles();
  return (
    <View
      style={s.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <View style={[s.fill, { width: `${Math.min(Math.max(value, 0), 1) * 100}%` }]} />
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.surfaceStrong, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: theme.colors.primary },
}));
