import type { TextStyle } from 'react-native';

import type { Language } from '@/i18n/languages';

/**
 * Typography is defined in two layers:
 *
 * 1. `variants` — the type scale in abstract terms (size, weight, role).
 * 2. `scripts` — per-language font families and metrics. Burmese needs a much
 *    taller line height than Latin (stacked vowels/medials clip otherwise) and
 *    its words are longer, so headlines can be scaled down per language.
 *
 * `role: 'latin'` is for numbers and the wordmark: always Inter with tight
 * line height, regardless of language, so "1,085" looks the same in both.
 */

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export type TextVariant =
  | 'display'
  | 'title'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'label'
  | 'caption'
  | 'numberXl'
  | 'numberLg'
  | 'numberMd'
  | 'numberSm'
  | 'wordmark';

type VariantSpec = {
  size: number;
  weight: FontWeight;
  role: 'text' | 'latin';
  /** Letter spacing in em (Latin only; ignored for Burmese). */
  tracking?: number;
};

export const variants: Record<TextVariant, VariantSpec> = {
  display: { size: 30, weight: 'bold', role: 'text', tracking: -0.02 },
  title: { size: 28, weight: 'bold', role: 'text', tracking: -0.02 },
  headline: { size: 20, weight: 'semibold', role: 'text', tracking: -0.01 },
  body: { size: 16, weight: 'regular', role: 'text' },
  bodyStrong: { size: 16, weight: 'semibold', role: 'text' },
  callout: { size: 15, weight: 'medium', role: 'text' },
  label: { size: 14, weight: 'medium', role: 'text' },
  caption: { size: 13, weight: 'regular', role: 'text' },
  numberXl: { size: 44, weight: 'bold', role: 'latin', tracking: -0.03 },
  numberLg: { size: 34, weight: 'bold', role: 'latin', tracking: -0.03 },
  numberMd: { size: 22, weight: 'bold', role: 'latin', tracking: -0.01 },
  numberSm: { size: 15, weight: 'semibold', role: 'latin' },
  wordmark: { size: 20, weight: 'bold', role: 'latin', tracking: -0.02 },
};

type ScriptSpec = {
  fonts: Record<FontWeight, string>;
  /** Line height as a multiple of font size. */
  lineHeight: number;
  /** Multiplier applied to every text-role size. */
  sizeScale: number;
  /** Whether `tracking` from the variant is applied. */
  useTracking: boolean;
  /** Smallest size allowed for this script (Burmese ≥ 13px rule). */
  minSize: number;
  /** Per-variant overrides when a single size doesn't suit the script. */
  overrides?: Partial<Record<TextVariant, Partial<VariantSpec> & { lineHeight?: number }>>;
};

export const fontFamilies = {
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  notoMyanmar: {
    regular: 'NotoSansMyanmar_400Regular',
    medium: 'NotoSansMyanmar_500Medium',
    semibold: 'NotoSansMyanmar_600SemiBold',
    bold: 'NotoSansMyanmar_700Bold',
  },
} as const;

const latinNumbers: ScriptSpec = {
  fonts: fontFamilies.inter,
  lineHeight: 1.15,
  sizeScale: 1,
  useTracking: true,
  minSize: 11,
};

export const scripts: Record<Language, ScriptSpec> = {
  en: {
    fonts: fontFamilies.inter,
    lineHeight: 1.35,
    sizeScale: 1,
    useTracking: true,
    minSize: 11,
    overrides: {
      title: { lineHeight: 1.2 },
      display: { lineHeight: 1.2 },
    },
  },
  my: {
    fonts: fontFamilies.notoMyanmar,
    lineHeight: 1.7,
    sizeScale: 1,
    useTracking: false,
    minSize: 13,
    overrides: {
      // Burmese headlines run long; slightly smaller keeps them to 1–2 lines.
      display: { size: 26, lineHeight: 1.55 },
      title: { size: 24, lineHeight: 1.55 },
      headline: { size: 18 },
    },
  },
};

export type TypeScale = Record<TextVariant, TextStyle>;

function resolve(variant: TextVariant, script: ScriptSpec, words = false): TextStyle {
  const base = variants[variant];
  const isLatin = base.role === 'latin' && !words;
  const spec = isLatin ? latinNumbers : script;
  const override = isLatin ? undefined : spec.overrides?.[variant];

  const weight = override?.weight ?? base.weight;
  const rawSize = override?.size ?? base.size * spec.sizeScale;
  const fontSize = Math.max(Math.round(rawSize), spec.minSize);
  const lineHeight = Math.round(fontSize * (override?.lineHeight ?? spec.lineHeight));
  const tracking = override?.tracking ?? base.tracking;

  return {
    fontFamily: spec.fonts[weight],
    fontSize,
    lineHeight,
    letterSpacing: spec.useTracking && tracking ? tracking * fontSize : 0,
    // Equal-width digits so changing numbers (kcal, %, weights) don't jiggle.
    ...(isLatin && { fontVariant: ['tabular-nums'] }),
    // Android adds extra top padding for custom fonts; our explicit
    // lineHeight already accounts for Burmese stacking.
    includeFontPadding: false,
  };
}

const cache = new Map<Language, TypeScale>();

export function buildTypeScale(language: Language): TypeScale {
  const hit = cache.get(language);
  if (hit) return hit;
  const script = scripts[language];
  const scale = Object.fromEntries(
    (Object.keys(variants) as TextVariant[]).map((v) => [v, resolve(v, script)]),
  ) as TypeScale;
  cache.set(language, scale);
  return scale;
}

/** True for the number styles (Inter, tight line height, equal-width digits). */
export const isNumberVariant = (variant: TextVariant) => variants[variant].role === 'latin';

let burmeseWords: TypeScale | null = null;

/**
 * Number styles for text that turns out to be Burmese words (e.g. "no goal yet"
 * where a weight would be): same size and weight, but the Burmese font and line
 * height, since Inter has no Burmese and its tight lines clip the stacked marks.
 */
export function burmeseWordsScale(): TypeScale {
  burmeseWords ??= Object.fromEntries(
    (Object.keys(variants) as TextVariant[]).map((v) => [v, resolve(v, scripts.my, true)]),
  ) as TypeScale;
  return burmeseWords;
}

/** Font family for a weight in the current language (for TextInput etc.). */
export function fontFor(language: Language, weight: FontWeight) {
  return scripts[language].fonts[weight];
}
