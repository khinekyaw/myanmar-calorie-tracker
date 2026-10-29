import { createContext, use, useMemo, type ReactNode } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import type { Language } from '@/i18n/languages';
import { useLanguage } from '@/store/settings';

import { themes, type Theme, type ThemeName } from './themes';
import { buildTypeScale, type TypeScale } from './typography';

export type StyleContext = {
  theme: Theme;
  /** Resolved text styles for the current language. */
  type: TypeScale;
  language: Language;
};

const Ctx = createContext<StyleContext | null>(null);

export function ThemeProvider({
  children,
  themeName = 'light',
}: {
  children: ReactNode;
  themeName?: ThemeName;
}) {
  const language = useLanguage();
  const value = useMemo<StyleContext>(
    () => ({ theme: themes[themeName], type: buildTypeScale(language), language }),
    [themeName, language],
  );
  return <Ctx value={value}>{children}</Ctx>;
}

export function useStyleContext() {
  const ctx = use(Ctx);
  if (!ctx) throw new Error('useStyleContext must be used inside <ThemeProvider>');
  return ctx;
}

export const useTheme = () => useStyleContext().theme;

/**
 * Create a styles hook from a factory that receives the theme, the resolved
 * type scale and the language. Styles are rebuilt only when one of those
 * changes, so switching language re-flows Burmese/English metrics.
 *
 *   const useStyles = makeStyles(({ theme, type }) => ({
 *     title: { ...type.title, color: theme.colors.text },
 *   }));
 */
type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<T extends NamedStyles>(
  // `T & NamedStyles` gives literals contextual types (like StyleSheet.create).
  factory: (ctx: StyleContext) => T & NamedStyles,
) {
  return function useStyles(): T {
    const ctx = useStyleContext();
    return useMemo(() => StyleSheet.create(factory(ctx)), [ctx]);
  };
}
