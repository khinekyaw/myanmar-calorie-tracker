import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles } from '@/theme/ThemeProvider';

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
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(150)} style={StyleSheet.absoluteFill}>
        <Pressable style={s.scrim} accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onCancel} />
      </Animated.View>
      <View style={s.bottom} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(220)}
          accessibilityViewIsModal
          style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />
          <Text variant="headline" align="center" accessibilityRole="header">
            {title}
          </Text>
          <View style={s.actions}>
            <Button label={confirmLabel} onPress={onConfirm} />
            <Button variant="ghost" label={cancelLabel} onPress={onCancel} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  scrim: { flex: 1, backgroundColor: theme.colors.scrim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    paddingHorizontal: theme.gutter,
    paddingTop: theme.space.md,
    gap: theme.space.xl,
    ...theme.shadow.sheet,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.sheetHandle },
  actions: { gap: theme.space.xs },
}));
