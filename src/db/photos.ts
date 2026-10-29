import { Directory, File, Paths } from 'expo-file-system';

/**
 * Meal photos live in the app's document folder, which Android doesn't clear
 * (the cache folder can be wiped at any time, losing queued photos).
 */
const dir = () => new Directory(Paths.document, 'meal-photos');

/** Move a compressed photo into permanent storage; returns its file URI. */
export function keepPhoto(tempUri: string, logId: string): string {
  const folder = dir();
  if (!folder.exists) folder.create({ intermediates: true });
  const dest = new File(folder, `${logId}.jpg`);
  if (dest.exists) dest.delete();
  new File(tempUri).move(dest);
  return dest.uri;
}

export function deletePhoto(uri: string | undefined) {
  if (!uri?.includes('meal-photos')) return;
  const f = new File(uri);
  if (f.exists) f.delete();
}
