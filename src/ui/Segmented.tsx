import { Pressable, View } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';

import { Text } from './Text';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** 'light' sits on a white page; 'surface' sits on a grey card. */
  tone?: 'light' | 'surface';
};

/** Small pill segmented control (weight/waist, language). */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel, tone = 'surface' }: Props<T>) {
  const s = useStyles();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[s.track, tone === 'light' && s.trackLight]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[s.item, selected && s.itemSelected]}>
            <Text variant="caption" tone={selected ? 'default' : 'muted'} style={selected && s.selectedText}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ theme, type }) => ({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceStrong,
  },
  trackLight: { backgroundColor: theme.colors.surface },
  item: {
    minHeight: 34,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelected: { backgroundColor: theme.colors.background },
  selectedText: { fontFamily: type.bodyStrong.fontFamily },
}));
