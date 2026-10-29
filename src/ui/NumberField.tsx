import { useRef } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';

import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';

import { Text } from './Text';

type Part = {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  accessibilityLabel?: string;
  /** Unit printed right after this part ("′", "lb"). */
  suffix?: string;
  decimal?: boolean;
};

type Props = {
  label: string;
  parts: Part[];
};

/**
 * Labelled numeric field: one row with a label on the left and one or more
 * number inputs on the right (e.g. height = feet + inches). Tapping anywhere
 * on the row focuses the first input.
 */
export function NumberField({ label, parts }: Props) {
  const s = useStyles();
  const { theme } = useStyleContext();
  const first = useRef<TextInputInstance>(null);

  return (
    <Pressable style={s.row} onPress={() => first.current?.focus()} accessible={false}>
      <Text variant="callout" tone="muted" style={s.label}>
        {label}
      </Text>
      <View style={s.inputs}>
        {parts.map((p, i) => (
          <View key={i} style={s.part}>
            <TextInput
              ref={i === 0 ? first : undefined}
              value={p.value}
              onChangeText={(t) => p.onChange(t.replace(p.decimal ? /[^0-9.]/g : /[^0-9]/g, ''))}
              keyboardType={p.decimal ? 'decimal-pad' : 'number-pad'}
              maxLength={p.maxLength}
              accessibilityLabel={p.accessibilityLabel ?? label}
              placeholder="–"
              placeholderTextColor={theme.colors.iconMuted}
              selectionColor={theme.colors.selection}
              cursorColor={theme.colors.cursor}
              selectionHandleColor={theme.colors.cursor}
              style={[s.input, { minWidth: 14 * p.maxLength }]}
            />
            {p.suffix && (
              <Text variant="callout" tone="muted">
                {p.suffix}
              </Text>
            )}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme, type }) => ({
  row: {
    minHeight: theme.size.field,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  label: { flex: 1 },
  inputs: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  part: { flexDirection: 'row', alignItems: 'baseline', gap: theme.space.xs },
  input: {
    ...type.numberMd,
    fontSize: 20,
    color: theme.colors.text,
    textAlign: 'right',
    paddingVertical: theme.space.md,
    paddingHorizontal: 0,
  },
}));
