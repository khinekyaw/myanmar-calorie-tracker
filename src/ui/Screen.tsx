import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { makeStyles } from '@/theme/ThemeProvider';

type Props = {
  children: ReactNode;
  /** Pinned to the bottom (e.g. the main button). */
  footer?: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

/** Page container: white background, safe areas, 20px gutter, optional sticky footer. */
export function Screen({ children, footer, scroll = false, edges = ['top', 'bottom'], contentStyle }: Props) {
  const s = useStyles();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[s.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[s.content, s.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={s.root} edges={edges}>
      {body}
      {footer && <View style={s.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: theme.gutter },
  footer: { paddingHorizontal: theme.gutter, paddingTop: theme.space.md, paddingBottom: theme.space.lg },
}));
