/**
 * AI scan contract (docs/PRODUCT_BRIEF.md §5), shared by the `scan` Edge
 * Function and its Jest tests. Pure TypeScript with no imports, so it runs
 * under Deno and Node alike.
 *
 * The vision model answers in SCAN_OUTPUT_SCHEMA; `parseScanOutput` checks
 * that answer against the dish catalogue and turns it into the
 * `ScanResponse` the app expects (src/services/scan.ts).
 */

export const UNITS = ['plate', 'bowl', 'spoon', 'piece', 'cup'] as const;
export type Unit = (typeof UNITS)[number];

export type CatalogueDish = { id: string; name_my: string; name_en: string; unit: Unit };

export type ScanItem = {
  /** Catalogue id, or null when the food isn't in the catalogue. */
  dish_id: string | null;
  /** What the model saw, for foods outside the catalogue. */
  name?: string;
  qty: number;
  unit: Unit;
  confidence: number;
};

export type ScanResponse = {
  shared_table: boolean;
  items: ScanItem[];
  /** Runner-up dishes for the low-confidence picker. */
  candidates?: { dish_id: string; confidence: number }[];
};

export const MAX_ITEMS = 12;
export const MAX_CANDIDATES = 3;
const MAX_QTY = 20;

/** JSON schema for structured outputs (`output_config.format`). */
export const SCAN_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['shared_table', 'items', 'candidates'],
  properties: {
    shared_table: { type: 'boolean' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dish_id', 'name', 'qty', 'unit', 'confidence'],
        properties: {
          dish_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          name: { type: 'string' },
          qty: { type: 'number' },
          unit: { type: 'string', enum: [...UNITS] },
          confidence: { type: 'number' },
        },
      },
    },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dish_id', 'confidence'],
        properties: {
          dish_id: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    },
  },
} as const;

export class ScanContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanContractError';
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Rice comes in half plates; everything else in halves too, at least ½. */
const roundQty = (qty: number) => Math.round(clamp(qty, 0, MAX_QTY) * 2) / 2;

/**
 * Validate the model's answer. Unknown dish ids become `dish_id: null` (the
 * name is kept), units are taken from the catalogue (the numbers are per
 * catalogue unit), and numbers are clamped. Throws ScanContractError when the
 * answer isn't usable at all.
 */
export function parseScanOutput(raw: unknown, catalogue: Map<string, CatalogueDish>): ScanResponse {
  if (!isRecord(raw) || typeof raw.shared_table !== 'boolean' || !Array.isArray(raw.items)) {
    throw new ScanContractError('answer is not a scan result');
  }

  const items: ScanItem[] = [];
  for (const it of raw.items.slice(0, MAX_ITEMS)) {
    if (!isRecord(it) || !finite(it.qty) || !finite(it.confidence)) continue;
    const dish = typeof it.dish_id === 'string' ? catalogue.get(it.dish_id) : undefined;
    const name = typeof it.name === 'string' ? it.name.trim().slice(0, 80) : '';
    if (!dish && !name) continue;
    const unit = dish?.unit ?? (UNITS.includes(it.unit as Unit) ? (it.unit as Unit) : 'piece');
    items.push({
      dish_id: dish?.id ?? null,
      ...(!dish && { name }),
      qty: roundQty(it.qty),
      unit,
      confidence: clamp(it.confidence, 0, 1),
    });
  }

  // The same dish listed twice: keep the first (most confident) mention.
  const seen = new Set<string>();
  const unique = items.filter((it) => {
    if (it.dish_id === null) return true;
    if (seen.has(it.dish_id)) return false;
    seen.add(it.dish_id);
    return true;
  });

  const candidates = (Array.isArray(raw.candidates) ? raw.candidates : [])
    .filter((c): c is { dish_id: string; confidence: number } =>
      isRecord(c) && typeof c.dish_id === 'string' && catalogue.has(c.dish_id) && finite(c.confidence),
    )
    .filter((c, i, all) => all.findIndex((o) => o.dish_id === c.dish_id) === i)
    .slice(0, MAX_CANDIDATES)
    .map((c) => ({ dish_id: c.dish_id, confidence: clamp(c.confidence, 0, 1) }));

  return {
    shared_table: raw.shared_table && unique.length > 1,
    items: unique,
    ...(candidates.length > 0 && { candidates }),
  };
}

/** One line per dish for the prompt: "id | Burmese | English | unit". */
export function catalogueLines(dishes: CatalogueDish[]): string {
  return [...dishes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => `${d.id} | ${d.name_my} | ${d.name_en} | ${d.unit}`)
    .join('\n');
}
