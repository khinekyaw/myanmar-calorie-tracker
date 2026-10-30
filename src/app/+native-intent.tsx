/**
 * Links opened into the app before Expo Router handles them. The Google
 * sign-in redirect (sarai://auth/callback) is read by the browser sheet in
 * services/auth.ts, so the router ignores it instead of showing "not found".
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    if (path.includes('auth/callback')) return initial ? '/' : null;
    return path;
  } catch {
    return '/';
  }
}
