import { NetworkStateType, useNetworkState } from 'expo-network';

import { useSettings } from '@/store/settings';

/**
 * Connectivity for the offline queue. `canUpload` also respects the
 * "Send photos on Wi-Fi only" setting. Settings → Developer → "Simulate
 * offline" forces offline in dev builds.
 */
export function useConnectivity() {
  const net = useNetworkState();
  const simulateOffline = useSettings((s) => s.devSimulateOffline);
  const wifiOnly = useSettings((s) => s.wifiOnlyUploads);

  // `isInternetReachable` can be undefined while Android is still checking.
  const online = !simulateOffline && net.isConnected !== false && net.isInternetReachable !== false;
  const onWifi = net.type === NetworkStateType.WIFI || net.type === NetworkStateType.ETHERNET;
  return { online, canUpload: online && (!wifiOnly || onWifi) };
}
