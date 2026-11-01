import { View } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';

type Props = {
  visible: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Bottom-sheet confirmation in the app's style (instead of the platform alert). */
export function ConfirmSheet({ visible, title, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  const s = useStyles();
  return (
    <BottomSheet visible={visible} onClose={onCancel} closeLabel={cancelLabel} contentStyle={s.content}>
      <Text variant="headline" align="center" accessibilityRole="header">
        {title}
      </Text>
      <View style={s.actions}>
        <Button label={confirmLabel} onPress={onConfirm} />
        <Button variant="ghost" label={cancelLabel} onPress={onCancel} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  content: { gap: theme.space.xl },
  actions: { gap: theme.space.xs },
}));
