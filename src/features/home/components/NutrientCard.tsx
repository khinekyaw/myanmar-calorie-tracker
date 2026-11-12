import { View } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';
import { Icon, Ring, Text, type IconName } from '@/ui';

type Props = {
  value: string;
  label: string;
  progress: number;
  color: string;
  icon: IconName;
  /** Went over its limit (blood sugar / pressure guidance): light amber fill. */
  over?: boolean;
  /** Alone in its row: number and label beside the ring instead of above it. */
  wide?: boolean;
};

/** A "left today" card: rice plates, protein, fat; sodium and sugary meals for health users. */
export function NutrientCard({ value, label, progress, color, icon, over = false, wide = false }: Props) {
  const s = useStyles();
  return (
    <View style={[s.card, wide && s.wide, over && s.over]} accessible accessibilityLabel={`${label} ${value}`}>
      <View style={wide && s.flex}>
        <Text variant="numberMd">{value}</Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Ring progress={progress} size={52} stroke={5} color={color}>
        <Icon name={icon} size={18} strokeWidth={1.8} />
      </Ring>
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  flex: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.space.lg,
    paddingHorizontal: theme.space.md,
    gap: theme.space.md,
    justifyContent: 'space-between',
  },
  wide: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg },
  over: { backgroundColor: theme.colors.nutrient.overSoft },
}));
