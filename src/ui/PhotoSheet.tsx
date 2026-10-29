import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PhotoSource } from '@/mocks/photos';
import { makeStyles } from '@/theme/ThemeProvider';

import { type IconName } from './icons/Icon';
import { IconButton } from './IconButton';

type Props = {
  photo?: PhotoSource;
  backLabel: string;
  children: ReactNode;
  /** Pinned under the content (buttons). */
  footer?: ReactNode;
  onBack?: () => void;
  /** Optional action at the top right (e.g. delete). */
  action?: { icon: IconName; label: string; onPress: () => void };
};

/**
 * Food photo on a dark band at the top, white rounded sheet below
 * (Result, PickDish).
 */
export function PhotoSheet({ photo, backLabel, children, footer, onBack, action }: Props) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={[s.photoBand, { height: 290 + insets.top }]}>
        {photo && <Image source={photo} style={s.photo} contentFit="cover" transition={200} />}
        {/* Keeps the white status-bar icons readable over bright photos. */}
        <View style={[s.statusShade, { height: insets.top + 8 }]} />
      </View>
      <View style={[s.back, { top: insets.top + 12 }]}>
        <IconButton
          icon="chevronLeft"
          variant="surface"
          accessibilityLabel={backLabel}
          onPress={onBack ?? (() => router.back())}
          style={s.backButton}
        />
      </View>
      {action && (
        <View style={[s.action, { top: insets.top + 12 }]}>
          <IconButton icon={action.icon} accessibilityLabel={action.label} onPress={action.onPress} style={s.backButton} />
        </View>
      )}
      <View style={[s.sheet, { marginTop: 262 + insets.top, paddingBottom: insets.bottom + 16 }]}>
        <View style={s.content}>{children}</View>
        {footer}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, backgroundColor: theme.colors.camera.viewfinder },
  photoBand: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: theme.colors.camera.viewfinder },
  photo: { width: '100%', height: '100%' },
  statusShade: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: theme.colors.photo.statusShade },
  back: { position: 'absolute', left: theme.gutter, zIndex: 2 },
  action: { position: 'absolute', right: theme.gutter, zIndex: 2 },
  backButton: { backgroundColor: theme.colors.photo.button },
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    paddingHorizontal: theme.gutter,
    paddingTop: theme.space.xxl,
    gap: theme.space.lg,
  },
  content: { flex: 1, gap: theme.space.lg },
}));
