import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, TextInput, View, type TextInputInstance } from 'react-native';

import { formatFixed, formatNumber } from '@/lib/format';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';

import { RulerPicker } from './RulerPicker';
import { Text } from './Text';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit: string;
  /** Ruler scale: lb (1 lb ticks, label every 10) or inches (¼ in ticks, label every inch). */
  scale: 'lb' | 'in';
  accessibilityLabel: string;
};

const SCALES = {
  lb: { tick: 1, major: 10, tickSpacing: 12 },
  in: { tick: 0.25, major: 1, tickSpacing: 14 },
} as const;

/**
 * Body measurement input: a big number you can tap and type (to jump straight
 * to 100) above a ruler you drag for fine changes (0.1 steps).
 */
export function MeasureInput({ value, onChange, min, max, unit, scale, accessibilityLabel }: Props) {
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const input = useRef<TextInputInstance>(null);
  const [draft, setDraft] = useState<string | null>(null);

  // One decimal always (150.0): the number keeps its width while the ruler moves.
  const shown = formatFixed(value, language);

  // Android keeps focus when the keyboard is dismissed; end editing so "190" shows as "190.0".
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => input.current?.blur());
    return () => sub.remove();
  }, []);
  const invalid = draft !== null && !isValid(draft, min, max);

  const onType = (text: string) => {
    const clean = text.replace(',', '.').replace(/[^0-9.]/g, '');
    setDraft(clean);
    if (isValid(clean, min, max)) onChange(Math.round(Number(clean) * 10) / 10);
  };

  return (
    <View style={s.root}>
      <Pressable style={s.valueRow} onPress={() => input.current?.focus()} accessible={false}>
        <TextInput
          ref={input}
          value={draft ?? shown}
          onFocus={() => setDraft(value.toFixed(1))}
          onBlur={() => setDraft(null)}
          onChangeText={onType}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          maxLength={5}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={`${min}–${max} ${unit}`}
          selectionColor={theme.colors.selection}
          cursorColor={theme.colors.cursor}
          selectionHandleColor={theme.colors.cursor}
          style={[s.number, invalid && s.invalid]}
        />
        <Text variant="body" tone="muted">
          {unit}
        </Text>
      </Pressable>
      <View style={[s.underline, draft !== null && s.underlineActive]} />
      <RulerPicker
        value={value}
        onChange={(v) => {
          setDraft(null);
          input.current?.blur();
          onChange(v);
        }}
        min={min}
        max={max}
        {...SCALES[scale]}
        formatLabel={(v) => formatNumber(v, language)}
        accessibilityLabel={accessibilityLabel}
        accessibilityValueText={`${shown} ${unit}`}
      />
    </View>
  );
}

function isValid(text: string, min: number, max: number) {
  if (!/^\d+(\.\d?)?$/.test(text)) return false;
  const n = Number(text);
  return n >= min && n <= max;
}

const useStyles = makeStyles(({ theme, type }) => ({
  root: { alignSelf: 'stretch', alignItems: 'center', gap: theme.space.md },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: theme.space.xs },
  number: {
    ...type.numberXl,
    fontSize: 60,
    lineHeight: 70,
    letterSpacing: -2,
    color: theme.colors.text,
    textAlign: 'center',
    minWidth: 150,
    paddingVertical: 0,
  },
  invalid: { color: theme.colors.textSubtle },
  underline: { width: 64, height: 3, borderRadius: 2, marginTop: -theme.space.sm, backgroundColor: theme.colors.surface },
  underlineActive: { backgroundColor: theme.colors.primary },
}));
