import { FunctionsHttpError } from '@supabase/supabase-js';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { DishId } from '@/data/dishes';
import type { MealItem } from '@/domain/meal';

import { ensureSession } from './auth';
import { supabase } from './supabase';

/**
 * Photo scan. Mirrors the AI scan contract in docs/PRODUCT_BRIEF.md §5.
 *
 * A 512px copy of the photo is uploaded to Storage (meal-photos/<user id>/<log id>.jpg),
 * then the "scan" Edge Function identifies the dishes
 * (supabase/functions/scan). Builds without a backend use the MOCK below.
 */

export type ScanResponse = {
  shared_table: boolean;
  /** `dish_id` null = a food not in the catalogue (its `name` is given). */
  items: { dish_id: DishId | null; name?: string; qty: number; unit: string; confidence: number }[];
  /** Runner-up dishes for the low-confidence picker (our extension). */
  candidates?: { dish_id: DishId; confidence: number }[];
};

/**
 * quota  — no free scans left today (server said so); wait for tomorrow or Premium
 * photo  — the server has no photo for this meal; upload it again
 * busy   — this photo is being scanned right now
 * retry  — network or server trouble; try again later
 */
export class ScanError extends Error {
  constructor(
    readonly kind: 'quota' | 'photo' | 'busy' | 'retry',
    message: string,
  ) {
    super(message);
    this.name = 'ScanError';
  }
}

export type ScanResult = { response: ScanResponse; scansLeft: number | null };

/** Below this, show PickDish instead of trusting the top match. */
export const CONFIDENCE_THRESHOLD = 0.6;

const MAX_EDGE = 800;
/**
 * The copy sent to the server for scanning: 512px uses ~60% fewer image
 * tokens than 800px (reports/Unit economics.md). The phone keeps the 800px
 * photo for display; meals restored on another phone show the 512px copy.
 */
export const SCAN_EDGE = 512;

/** Resize to `maxEdge` on the long edge and re-encode as JPEG for slow data. */
export async function compressPhoto(uri: string, width: number, height: number, maxEdge = MAX_EDGE): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > maxEdge) ctx.resize(height > width ? { height: maxEdge } : { width: maxEdge });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}

/** A SCAN_EDGE copy of a saved photo (the photo itself when it is already that small). */
async function scanCopy(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  if (Math.max(image.width, image.height) <= SCAN_EDGE) return uri;
  return compressPhoto(uri, image.width, image.height, SCAN_EDGE);
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

async function mockScan(): Promise<ScanResult> {
  await new Promise((r) => setTimeout(r, 1800));
  const response = SCENARIOS[next % SCENARIOS.length];
  next += 1;
  return { response, scansLeft: null };
}

/** Upload the meal photo for scanning; returns its path on the server. */
export async function uploadPhoto(logId: string, photoUri: string): Promise<string> {
  if (!supabase) return '';
  const userId = await ensureSession();
  const path = `${userId}/${logId}.jpg`;
  const small = await scanCopy(photoUri).catch(() => {
    throw new ScanError('retry', 'photo file missing on the phone');
  });
  const body = await new File(small).arrayBuffer().catch(() => {
    throw new ScanError('retry', 'photo file missing on the phone');
  });
  if (small !== photoUri) {
    try {
      new File(small).delete();
    } catch {
      // A leftover temp file is harmless.
    }
  }
  // upsert: a retried upload replaces a half-finished one.
  const { error } = await supabase.storage.from('meal-photos').upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new ScanError('retry', `upload: ${error.message}`);
  return path;
}

/** Identify the dishes in an uploaded meal photo. Safe to repeat for the same meal. */
export async function scanPhoto(logId: string, takenAt: Date): Promise<ScanResult> {
  if (!supabase) return mockScan();
  const { data, error } = await supabase.functions.invoke<{ scan: ScanResponse; scans_left: number | null }>('scan', {
    body: { log_id: logId, taken_at: takenAt.toISOString() },
    timeout: 60_000,
  });
  if (error) {
    const status = error instanceof FunctionsHttpError ? (error.context as Response).status : 0;
    if (status === 402) throw new ScanError('quota', 'no free scans left');
    if (status === 404) throw new ScanError('photo', 'photo not on the server');
    if (status === 409) throw new ScanError('busy', 'already scanning');
    throw new ScanError('retry', `scan: ${status || error.message}`);
  }
  if (!data) throw new ScanError('retry', 'scan: empty answer');
  return { response: data.scan, scansLeft: data.scans_left };
}

/** Map a scan response onto log items (unknown dishes are dropped for now). */
export function toMealItems(res: ScanResponse): MealItem[] {
  return res.items
    .filter((i): i is typeof i & { dish_id: DishId } => i.dish_id !== null)
    .map((i) => ({ dishId: i.dish_id, qty: i.qty, oil: 'normal' as const }));
}
