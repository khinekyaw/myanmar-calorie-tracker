import { Pressable, View } from 'react-native';

import { tap } from '@/lib/haptics';
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
  /** 'sm' = compact pill (weight/waist, language); 'lg' = full-width, solid ink selection (pace). */
  size?: 'sm' | 'lg';
};

/** Pill segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  tone = 'surface',
  size = 'sm',
}: Props<T>) {
  const s = useStyles();
  const lg = size === 'lg';
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[s.track, tone === 'light' && s.trackLight, lg && s.trackLg]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            // Remount on selection so Android rounds the new fill (see docs → shape rules).
            key={`${o.value}-${selected}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              tap();
              onChange(o.value);
            }}
            style={[s.item, lg && s.itemLg, selected && (lg ? s.itemSelectedLg : s.itemSelected)]}>
            <Text
              variant={lg ? 'body' : 'caption'}
              tone={selected ? (lg ? 'inverse' : 'default') : 'muted'}
              style={selected && s.selectedText}>
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
  trackLg: { padding: 4 },
  item: {
    minHeight: 34,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLg: { flex: 1, minHeight: 44 },
  itemSelected: { backgroundColor: theme.colors.background },
  itemSelectedLg: { backgroundColor: theme.colors.selected },
  selectedText: { fontFamily: type.bodyStrong.fontFamily },
}));
