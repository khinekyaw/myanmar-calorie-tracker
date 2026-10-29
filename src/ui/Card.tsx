import { View, type ViewProps } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';

/** Borderless grey card (radius 20–24). No shadows by design. */
export function Card({ style, size = 'lg', ...rest }: ViewProps & { size?: 'md' | 'lg' }) {
  const s = useStyles();
  return <View style={[s.base, size === 'lg' ? s.lg : s.md, style]} {...rest} />;
}

const useStyles = makeStyles(({ theme }) => ({
  base: { backgroundColor: theme.colors.surface },
  lg: { borderRadius: theme.radius.xl, padding: theme.space.xl },
  md: { borderRadius: theme.radius.lg, padding: theme.space.lg },
}));
