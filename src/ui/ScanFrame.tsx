import { StyleSheet, View } from 'react-native';

type Props = { color: string; inset: number; size?: number; thickness?: number; radius?: number };

/** Four rounded corner brackets — the "scan" viewfinder motif. */
export function ScanFrame({ color, inset, size = 34, thickness = 3, radius = 14 }: Props) {
  const corner = { position: 'absolute', width: size, height: size, borderColor: color } as const;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: inset }]} accessible={false}>
      <View style={[corner, { top: 0, left: 0, borderTopWidth: thickness, borderLeftWidth: thickness, borderTopLeftRadius: radius }]} />
      <View style={[corner, { top: 0, right: 0, borderTopWidth: thickness, borderRightWidth: thickness, borderTopRightRadius: radius }]} />
      <View style={[corner, { bottom: 0, left: 0, borderBottomWidth: thickness, borderLeftWidth: thickness, borderBottomLeftRadius: radius }]} />
      <View style={[corner, { bottom: 0, right: 0, borderBottomWidth: thickness, borderRightWidth: thickness, borderBottomRightRadius: radius }]} />
    </View>
  );
}
