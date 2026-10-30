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
    /** Primary = brand black: almost everything (text, buttons, selected states). */
    primary: palette.ink,
    onPrimary: palette.white,
    /**
     * Accent = brand gold, used sparingly for brand and premium moments
     * (logo mark, Premium, "best value", plan ready). Never on nutrient
     * indicators (rice is amber) and never as text on white (contrast 2:1):
     * put ink text on gold instead.
     */
    accent: palette.gold,
    onAccent: palette.ink,
    accentSoft: palette.cream,
    selected: palette.ink,
    onSelected: palette.white,
    switchOff: palette.gray300,
    scrim: palette.black40,
    /** Text fields: light highlight so selected (ink) text stays readable; ink caret and handles. */
    selection: palette.ink18,
    cursor: palette.ink,
    /** Subtle fill on ink surfaces (icon wells on black, tags on selected). */
    onInkSubtle: palette.white14,
    /** Over food photos: back button, status-bar shade, queued-photo dim. */
    photo: {
      button: palette.white92,
      statusShade: palette.black28,
      dim: palette.black35,
    },
    sheetHandle: palette.gray300,
    camera: {
      background: palette.black,
      control: palette.white14,
      controlActive: palette.white32,
      foreground: palette.white,
      frame: palette.white,
      viewfinder: palette.gray900,
    },
    nutrient: {
      carbs: palette.amber,
      protein: palette.coral,
      fat: palette.violet,
    },
    /** Week strip on Home: a day that went over its calorie target. */
    kcal: {
      over: palette.amber,
    },
    /** Home streak fire: the one decorative colour outside nutrients and BMI. */
    streak: {
      outerTop: palette.flameOrangeLight,
      outerBottom: palette.flameOrange,
      innerTop: palette.flameYellowLight,
      innerBottom: palette.flameYellow,
      inactive: palette.gray400,
    },
    /** Holographic "badges earned" coin on Milestones. */
    holo: {
      facets: [
        palette.holoPink,
        palette.holoLavender,
        palette.holoBlue,
        palette.holoMint,
        palette.holoYellow,
        palette.holoPeach,
      ],
      base: palette.white,
      rim: palette.holoRim,
      emblem: palette.holoEmblem,
      emblemLight: palette.holoEmblemLight,
      edge: palette.holoEdge,
      shine: palette.white,
    },
    /** Google "G" logo on the sign-in button. */
    google: {
      blue: palette.googleBlue,
      red: palette.googleRed,
      yellow: palette.googleYellow,
      green: palette.googleGreen,
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
  /** Horizontal page gutter — the same on every screen. */
  gutter: 16,
  /**
   * Press feedback. Grey options darken to `surfaceStrong` when pressed;
   * everything else (buttons, rows, chips, cards) fades to `pressed`.
   */
  opacity: {
    pressed: 0.7,
    disabled: 0.35,
  },
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
