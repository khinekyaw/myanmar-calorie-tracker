import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useStyleContext } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/themes';
import { buildTypeScale, burmeseWordsScale, isNumberVariant, type TextVariant } from '@/theme/typography';

type Tone = 'default' | 'muted' | 'subtle' | 'inverse';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: Tone;
  /** Escape hatch for one-off colours (e.g. nutrient colours). */
  color?: string;
  align?: 'left' | 'center' | 'right';
  /**
   * The text decides the width of its box (a pill, chip or badge). Android
   * measures Burmese a little narrower than it draws, so at large font sizes
   * the last mark (the dot in နေ့) is cut off; this adds a no-break space
   * after Burmese text to make room.
   */
  hugged?: boolean;
};

const toneColor = (theme: Theme, tone: Tone) =>
  ({
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    subtle: theme.colors.textSubtle,
    inverse: theme.colors.textInverse,
  })[tone];

// Myanmar, Myanmar Extended-A and Extended-B blocks.
const MYANMAR = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;

/**
 * The only way to render text. Picks font family, size and line height for
 * the current language from the type scale (see theme/typography.ts).
 * Plain strings in the "other" script follow their own script: Burmese inside
 * the English UI ("မြန်မာ" in the switcher) gets the Burmese font and metrics,
 * and Latin-only strings inside the Burmese UI ("Premium", "KBZPay") get Inter.
 * A number style holding Burmese words gets the Burmese font at the same size.
 */
export function Text({ variant = 'body', tone = 'default', color, align, hugged, style, children, ...rest }: TextProps) {
  const { theme, type, language } = useStyleContext();
  const script = typeof children === 'string' ? (MYANMAR.test(children) ? 'my' : 'en') : language;
  const scale =
    typeof children === 'string' && script === 'my' && isNumberVariant(variant)
      ? burmeseWordsScale()
      : script === language
        ? type
        : buildTypeScale(script);
  return (
    <RNText
      {...rest}
      style={[scale[variant], { color: color ?? toneColor(theme, tone) }, align && { textAlign: align }, style]}>
      {hugged && typeof children === 'string' && script === 'my' ? `${children}\u00A0` : children}
    </RNText>
  );
}
