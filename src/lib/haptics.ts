import * as Haptics from 'expo-haptics';

/** Light tick for selections and toggles. Centralised so it can be turned off. */
export function tap() {
  void Haptics.selectionAsync().catch(() => {});
}
