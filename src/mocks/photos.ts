/**
 * PLACEHOLDER food photos, hot-linked from Wikimedia Commons.
 * Replace with Sar AI's own dish photos (bundled or from Supabase Storage)
 * before launch. Licences: CC0 / CC BY-SA — attribution required if shipped.
 */
const commons = (path: string, width = 500) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${width}px-${path.split('/').pop()}`;

export const photos = {
  /** "Mohinga bowl.jpg" — CC0 */
  mohinga: commons('9/9b/Mohinga_bowl.jpg'),
  mohingaLarge: commons('9/9b/Mohinga_bowl.jpg', 960),
  /** "Laphet thoke.JPG" — CC BY-SA 3.0 */
  laphetThoke: commons('6/64/Laphet_thoke.JPG'),
  /** "Myanmar Traditional Tea.jpg" — CC BY-SA 4.0 */
  tea: commons('5/51/Myanmar_Traditional_Tea.jpg'),
  /** "Palatha, Myanmar.jpg" — CC BY-SA 2.0 */
  palata: commons('6/69/Palatha%2C_Myanmar.jpg'),
  /** "Myanma cuisine (cropped).jpg" — CC BY-SA 2.0 (shared table) */
  sharedTable: commons('a/a8/Myanma_cuisine_%28cropped%29.jpg'),
} as const;
