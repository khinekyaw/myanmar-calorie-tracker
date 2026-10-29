import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';

import { Icon } from './icons/Icon';
import { Switch } from './Switch';
import { Text } from './Text';

type Base = { label: string; last?: boolean };

type Props =
  | (Base & { kind: 'link'; value?: string; onPress: () => void })
  | (Base & { kind: 'switch'; value: boolean; onValueChange: (v: boolean) => void })
  | (Base & { kind: 'custom'; right: ReactNode });

/** Settings-style row with a hairline divider. */
export function ListRow(props: Props) {
  const s = useStyles();
  const label = (
    <Text variant="body" style={s.label}>
      {props.label}
    </Text>
  );

  if (props.kind === 'link') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={props.onPress}
        style={({ pressed }) => [s.row, !props.last && s.divider, pressed && s.pressed]}>
        {label}
        {props.value && (
          <Text variant="callout" tone="muted">
            {props.value}
          </Text>
        )}
        <Icon name="chevronRight" size={18} color={s.chevron.color} />
      </Pressable>
    );
  }

  if (props.kind === 'switch') {
    return (
      <Pressable
        accessible={false}
        onPress={() => props.onValueChange(!props.value)}
        style={[s.row, !props.last && s.divider]}>
        {label}
        <Switch value={props.value} onValueChange={props.onValueChange} accessibilityLabel={props.label} />
      </Pressable>
    );
  }

  return (
    <View style={[s.row, !props.last && s.divider]}>
      {label}
      {props.right}
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  row: {
    minHeight: theme.size.option,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.hairline },
  pressed: { opacity: theme.opacity.pressed },
  label: { flex: 1 },
  chevron: { color: theme.colors.iconMuted },
}));
