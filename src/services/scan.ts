import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { DishId } from '@/mocks/dishes';
import type { MealItem } from '@/domain/meal';

/**
 * Photo scan. Mirrors the AI scan contract in docs/PRODUCT_BRIEF.md §5.
 *
 * MOCK: no network call yet. The real version uploads the compressed photo
 * to Supabase Storage and calls the "scan" Edge Function with the
 * candidate dish list; the response has the same shape as `ScanResponse`.
 */

export type ScanResponse = {
  shared_table: boolean;
  items: { dish_id: DishId | null; qty: number; unit: string; confidence: number }[];
  /** Runner-up dishes for the low-confidence picker (our extension). */
  candidates?: { dish_id: DishId; confidence: number }[];
};

/** Below this, show PickDish instead of trusting the top match. */
export const CONFIDENCE_THRESHOLD = 0.6;

const MAX_EDGE = 800;

/** Resize to 800px on the long edge and re-encode as JPEG for slow data. */
export async function compressPhoto(uri: string, width: number, height: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) ctx.resize(height > width ? { height: MAX_EDGE } : { width: MAX_EDGE });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}

// Demo scenarios, used in turn so every branch of the flow can be tried.
const SCENARIOS: ScanResponse[] = [
  {
    shared_table: false,
    items: [{ dish_id: 'mohinga', qty: 1, unit: 'bowl', confidence: 0.86 }],
  },
  {
    shared_table: true,
    items: [
      { dish_id: 'rice', qty: 1.5, unit: 'plate', confidence: 0.9 },
      { dish_id: 'chickenCurry', qty: 4, unit: 'spoon', confidence: 0.8 },
      { dish_id: 'gourdFritter', qty: 3, unit: 'spoon', confidence: 0.72 },
      { dish_id: 'driedFish', qty: 0, unit: 'spoon', confidence: 0.55 },
      { dish_id: 'clearSoup', qty: 1, unit: 'bowl', confidence: 0.7 },
      { dish_id: 'ngapiYay', qty: 1, unit: 'spoon', confidence: 0.65 },
    ],
  },
  {
    shared_table: false,
    items: [{ dish_id: 'chickenCurry', qty: 4, unit: 'spoon', confidence: 0.48 }],
    candidates: [
      { dish_id: 'chickenCurry', confidence: 0.48 },
      { dish_id: 'porkCurry', confidence: 0.31 },
      { dish_id: 'fishCurry', confidence: 0.12 },
    ],
  },
];
let next = 0;

export async function scanPhoto(_photoUri: string): Promise<ScanResponse> {
  await new Promise((r) => setTimeout(r, 1800));
  const res = SCENARIOS[next % SCENARIOS.length];
  next += 1;
  return res;
}

/** Map a scan response onto log items (unknown dishes are dropped for now). */
export function toMealItems(res: ScanResponse): MealItem[] {
  return res.items
    .filter((i): i is typeof i & { dish_id: DishId } => i.dish_id !== null)
    .map((i) => ({ dishId: i.dish_id, qty: i.qty, oil: 'normal' as const }));
}
