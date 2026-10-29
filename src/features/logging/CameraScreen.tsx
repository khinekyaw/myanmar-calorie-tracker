import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { tap } from '@/lib/haptics';
import { formatNumber } from '@/lib/format';
import { useConnectivity } from '@/lib/network';
import { compressPhoto } from '@/services/scan';
import { useLog } from '@/store/log';
import { FREE_SCANS_PER_DAY, useScanQuota, useScansLeft } from '@/store/scanQuota';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, IconButton, ScanFrame, Text } from '@/ui';

/**
 * Full-screen food camera. The free-scan counter opens the paywall; when no
 * scans are left the shutter opens the paywall instead of capturing.
 */
export function CameraScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const scansLeft = useScansLeft();
  const consume = useScanQuota((st) => st.consume);

  const { canUpload } = useConnectivity();
  const addEntry = useLog((st) => st.addEntry);

  // Save the compressed photo to the queue. Online → straight to Result
  // (the scan queue picks it up); offline → back Home, where it waits.
  const afterCapture = async ({ uri, width, height }: { uri: string; width: number; height: number }) => {
    consume();
    const photoUri = await compressPhoto(uri, width, height).catch(() => uri);
    const id = addEntry({ source: 'photo', status: 'queued', photoUri, items: [] });
    if (canUpload) router.replace({ pathname: '/result', params: { id } });
    else router.back();
  };

  const shoot = async () => {
    if (scansLeft <= 0) return router.push('/paywall');
    if (!camera.current || busy) return;
    tap();
    setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.7 });
      await afterCapture(photo);
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    if (scansLeft <= 0) return router.push('/paywall');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) await afterCapture(res.assets[0]);
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {permission?.granted ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.permission]}>
          <Text variant="headline" tone="inverse" align="center">
            {t('camera.permissionTitle')}
          </Text>
          {permission && (
            <Button variant="light" label={t('camera.permissionAllow')} onPress={requestPermission} />
          )}
        </View>
      )}

      <View style={[s.frameArea, { top: insets.top + 80, bottom: insets.bottom + 150 }]} pointerEvents="none">
        <ScanFrame color={theme.colors.camera.frame} inset={0} size={40} thickness={3.5} radius={18} />
      </View>

      <View style={[s.topBar, { paddingTop: insets.top + theme.space.md }]}>
        <IconButton icon="close" variant="onDark" accessibilityLabel={t('common.close')} onPress={() => router.back()} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('camera.freeScans', { count: scansLeft })}
          onPress={() => router.push('/paywall')}
          style={s.counter}>
          <Text variant="numberSm" tone="inverse">
            {formatNumber(scansLeft, language)}/{formatNumber(FREE_SCANS_PER_DAY, language)}
          </Text>
        </Pressable>
        <IconButton
          icon="bolt"
          variant="onDark"
          accessibilityLabel={t('camera.flash')}
          accessibilityState={{ selected: torch }}
          onPress={() => setTorch((v) => !v)}
          style={torch && s.torchOn}
        />
      </View>

      <View style={[s.bottomBar, { paddingBottom: insets.bottom + theme.space.xxxl }]}>
        <IconButton icon="image" variant="onDark" size={52} accessibilityLabel={t('camera.gallery')} onPress={pickFromGallery} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('camera.shutter')}
          disabled={!permission?.granted || busy}
          onPress={shoot}
          style={({ pressed }) => [s.shutter, pressed && { transform: [{ scale: 0.94 }] }]}>
          <View style={s.shutterInner} />
        </Pressable>
        <IconButton icon="barcode" variant="onDark" size={52} accessibilityLabel={t('add.barcode')} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, backgroundColor: theme.colors.camera.background },
  permission: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.xxxl,
    gap: theme.space.xl,
    backgroundColor: theme.colors.camera.viewfinder,
  },
  frameArea: { position: 'absolute', left: 36, right: 36 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
  },
  counter: {
    height: 36,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.camera.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchOn: { backgroundColor: theme.colors.camera.controlActive },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: theme.colors.camera.foreground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.camera.foreground },
}));
