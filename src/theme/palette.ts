/**
 * Raw colour values. This is the ONLY file that should contain hex codes.
 * Components never import this directly — they read semantic colours from
 * the theme (see themes.ts), so a rebrand is a change here + in themes.ts.
 */
export const palette = {
  ink: '#0A0A0A',
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
  green: '#30A46C',
  red: '#E5484D',
} as const;
