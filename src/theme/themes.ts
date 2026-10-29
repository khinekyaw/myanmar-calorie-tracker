import { palette } from './palette';

/**
 * Semantic theme. Components use these names ("surface", "textMuted"),
 * never raw palette values, so colours, shapes and sizes can change in one place.
 *
 * Design rule: colour only appears on nutrient indicators. Everything else
 * is monochrome (ink on white, #F4F4F5 surfaces).
 */
export const lightTheme = {
  name: 'light',
  colors: {
    background: palette.white,
    surface: palette.gray100,
    surfaceStrong: palette.gray200,
    hairline: palette.gray150,
    text: palette.ink,
    textMuted: palette.gray600,
    textSubtle: palette.gray500,
    textInverse: palette.white,
    icon: palette.ink,
    iconMuted: palette.gray450,
    primary: palette.ink,
    onPrimary: palette.white,
    selected: palette.ink,
    onSelected: palette.white,
    switchOff: palette.gray300,
    scrim: 'rgba(0,0,0,0.4)',
    sheetHandle: palette.gray300,
    camera: {
      background: palette.black,
      control: 'rgba(255,255,255,0.14)',
      foreground: palette.white,
      frame: palette.white,
      viewfinder: palette.gray900,
    },
    nutrient: {
      carbs: palette.amber,
      protein: palette.coral,
      fat: palette.blue,
    },
    bmi: {
      under: palette.blue,
      normal: palette.green,
      over: palette.amber,
      obese: palette.red,
    },
  },
  /** Corner radii. Cards 20–24, options 16, buttons are pills. */
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    pill: 999,
  },
  space: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  /** Horizontal page gutter. */
  gutter: 20,
  size: {
    button: 56,
    buttonSm: 44,
    iconButton: 44,
    option: 56,
    optionLg: 64,
    field: 60,
    tabBar: 64,
    fab: 60,
    chip: 40,
    minTouch: 44,
  },
  /** Shadows are only allowed on the floating + button and bottom sheets. */
  shadow: {
    floating: {
      boxShadow: '0px 8px 20px rgba(0,0,0,0.18)',
    },
    sheet: {
      boxShadow: '0px -4px 24px rgba(0,0,0,0.08)',
    },
    chip: {
      boxShadow: '0px 8px 28px rgba(0,0,0,0.10)',
    },
  },
} as const;

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : { [K in keyof T]: Widen<T[K]> };

export type Theme = Widen<typeof lightTheme>;

/** Add `darkTheme` here later; ThemeProvider picks by name. */
export const themes = {
  light: lightTheme as Theme,
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof themes;
