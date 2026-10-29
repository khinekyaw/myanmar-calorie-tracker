import { View } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';
import { Icon, Ring, Text, type IconName } from '@/ui';

type Props = {
  value: string;
  label: string;
  progress: number;
  color: string;
  icon: IconName;
};

/** One of the three "left today" cards: rice plates, protein, fat. */
export function NutrientCard({ value, label, progress, color, icon }: Props) {
  const s = useStyles();
  return (
    <View style={s.card} accessible accessibilityLabel={`${label} ${value}`}>
      <View>
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
  card: {
    flex: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.space.lg,
    paddingHorizontal: theme.space.md,
    gap: theme.space.md,
    justifyContent: 'space-between',
  },
}));
