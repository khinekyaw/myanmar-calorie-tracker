/**
 * PLACEHOLDER food photos, bundled in the app so they show offline.
 * Source: Wikimedia Commons (500 px thumbnails). Replace with Sar AI's own
 * dish photos before launch; CC BY-SA images need attribution if shipped.
 */
export const photos = {
  /** "Mohinga bowl.jpg" — CC0 */
  mohinga: require('@/assets/images/dishes/mohinga.jpg'),
  /** "Laphet thoke.JPG" — CC BY-SA 3.0 */
  laphetThoke: require('@/assets/images/dishes/laphet-thoke.jpg'),
  /** "Myanmar Traditional Tea.jpg" — CC BY-SA 4.0 */
  tea: require('@/assets/images/dishes/tea.jpg'),
  /** "Palatha, Myanmar.jpg" — CC BY-SA 2.0 */
  palata: require('@/assets/images/dishes/palata.jpg'),
  /** "Myanma cuisine (cropped).jpg" — CC BY-SA 2.0 (shared table) */
  sharedTable: require('@/assets/images/dishes/shared-table.jpg'),
  /** "Male, Myanmar curry.jpg" — CC BY-SA 4.0 */
  curry: require('@/assets/images/dishes/curry.jpg'),
} as const;

/** A bundled image (`require` result) or a file/remote URI. */
export type PhotoSource = number | string;
