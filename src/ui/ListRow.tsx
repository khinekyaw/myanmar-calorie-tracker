import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { makeStyles } from '@/theme/ThemeProvider';

import { Icon } from './icons/Icon';
import { PremiumCrown } from './PremiumCrown';
import { Switch } from './Switch';
import { Text } from './Text';

type Base = {
  label: string;
  last?: boolean;
  /** Gold crown before the switch / value: a Premium feature, shown to people without a pass. */
  premium?: boolean;
};

type Props =
  | (Base & { kind: 'link'; value?: string; onPress: () => void })
  | (Base & {
      kind: 'switch';
      value: boolean;
      onValueChange: (v: boolean) => void;
      /** One short line under the label saying what the switch does (always shown, so nothing shifts). */
      note?: string;
    })
  | (Base & { kind: 'custom'; right: ReactNode });

/** Settings-style row with a hairline divider. */
export function ListRow(props: Props) {
  const s = useStyles();
  const { t } = useTranslation();
  const title = <Text variant="body">{props.label}</Text>;
  const label = <View style={s.label}>{title}</View>;
  const crown = props.premium ? <PremiumCrown /> : null;
  const a11yLabel = props.premium ? `${props.label}, ${t('paywall.title')}` : props.label;

  if (props.kind === 'link') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={props.onPress}
        style={({ pressed }) => [s.row, !props.last && s.divider, pressed && s.pressed]}>
        {label}
        {crown}
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
    const { note } = props;
    return (
      <Pressable
        accessible={false}
        onPress={() => props.onValueChange(!props.value)}
        style={[s.row, !props.last && s.divider]}>
        {note ? (
          <View style={s.label}>
            {title}
            <Text variant="caption" tone="muted" style={s.note}>
              {note}
            </Text>
          </View>
        ) : (
          label
        )}
        {crown}
        <Switch value={props.value} onValueChange={props.onValueChange} accessibilityLabel={a11yLabel} />
      </Pressable>
    );
  }

  return (
    <View style={[s.row, !props.last && s.divider]}>
      {label}
      {crown}
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
  note: { marginTop: 2 },
  chevron: { color: theme.colors.iconMuted },
}));
