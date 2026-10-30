/**
 * Raw colour values. This is the ONLY file that should contain hex codes.
 * Components never import this directly — they read semantic colours from
 * the theme (see themes.ts), so a rebrand is a change here + in themes.ts.
 */
export const palette = {
  /** Brand black: primary for text, buttons, selection. */
  ink: '#111217',
  black: '#000000',
  white: '#FFFFFF',

  gray50: '#FAFAFA',
  gray100: '#F4F4F5',
  gray150: '#EFEFEF',
  gray200: '#E4E4E7',
  gray300: '#D4D4D8',
  gray400: '#A1A1AA',
  gray450: '#8E8E96',
  gray500: '#71717A',
  gray600: '#666666',
  gray700: '#3F3F46',
  gray900: '#1C1C1E',

  amber: '#F5A524',
  coral: '#E5674B',
  blue: '#3E7BFA',
  violet: '#8B5CF6',
  green: '#30A46C',
  red: '#E5484D',

  /** Streak fire gradient (outer flame, then its yellow core). */
  flameOrangeLight: '#F2A04A',
  flameOrange: '#E3883A',
  flameYellow: '#F7D488',
  flameYellowLight: '#FCEAB0',

  /** Holographic "badges earned" coin on Milestones. */
  holoPink: '#F4B4D6',
  holoLavender: '#CBB8F3',
  holoBlue: '#AED3F7',
  holoMint: '#AEE7D0',
  holoPeach: '#F8D2AC',
  holoYellow: '#F3E7A8',
  holoRim: '#D6C2EE',
  holoEmblem: '#F1B9D5',
  holoEmblemLight: '#FBE1EE',
  holoEdge: '#DDA0C2',

  /** Google "G" logo (brand colours, required on the sign-in button). */
  googleBlue: '#4285F4',
  googleRed: '#EA4335',
  googleYellow: '#FBBC05',
  googleGreen: '#34A853',

  /** Brand gold (from the logo) and its cream. */
  gold: '#DEA84A',
  cream: '#FCF8F2',

  // Translucent overlays
  white14: 'rgba(255,255,255,0.14)',
  white32: 'rgba(255,255,255,0.32)',
  white92: 'rgba(255,255,255,0.92)',
  black28: 'rgba(0,0,0,0.28)',
  black35: 'rgba(0,0,0,0.35)',
  black40: 'rgba(0,0,0,0.4)',
  ink18: 'rgba(17,18,23,0.18)',
} as const;
