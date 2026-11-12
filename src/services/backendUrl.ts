/**
 * `.env.local` points the app at the local Supabase stack as the Android
 * emulator sees it: 10.0.2.2 is its alias for the Mac. The iOS Simulator
 * shares the Mac's network, so there it becomes localhost. A real iPhone gets
 * the Mac's Wi-Fi address from `npm run ios:device`, which builds it in
 * (docs/BACKEND.md → "Testing on an iPhone").
 */
export function resolveBackendUrl(url: string, os: string, isSimulator: boolean): string {
  if (os !== 'ios' || !isSimulator) return url;
  return url.replace(/^(https?:\/\/)10\.0\.2\.2(?=[:/]|$)/, '$1localhost');
}
