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

/** `generic`: an "Other …" type (dishes.source = 'generic'), only for foods not in the catalogue. */
export type CatalogueDish = { id: string; name_my: string; name_en: string; unit: Unit; generic?: boolean };

/** Estimated numbers for ONE unit of a food that isn't in the catalogue. */
export type Estimate = { kcal: number; carb_g: number; protein_g: number; fat_g: number };

export type ScanItem = {
  /** Catalogue id, or null when the food isn't in the catalogue. */
  dish_id: string | null;
  /** What the model saw, for foods outside the catalogue (English). */
  name?: string;
  /** The same in Burmese, when the model knows it. */
  name_my?: string;
  /** Foods outside the catalogue: the closest "Other …" type, whose unit `qty` counts. */
  closest?: string;
  estimate?: Estimate;
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
        required: ['dish_id', 'name', 'name_my', 'closest', 'estimate', 'qty', 'unit', 'confidence'],
        properties: {
          dish_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          name: { type: 'string' },
          name_my: { type: 'string' },
          closest: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          estimate: {
            anyOf: [
              {
                type: 'object',
                additionalProperties: false,
                required: ['kcal', 'carb_g', 'protein_g', 'fat_g'],
                properties: {
                  kcal: { type: 'number' },
                  carb_g: { type: 'number' },
                  protein_g: { type: 'number' },
                  fat_g: { type: 'number' },
                },
              },
              { type: 'null' },
            ],
          },
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

/** Upper bounds for one unit, so a wild guess can't wreck someone's day. */
const ESTIMATE_MAX: Estimate = { kcal: 1500, carb_g: 250, protein_g: 120, fat_g: 120 };
const round1 = (n: number) => Math.round(n * 10) / 10;

function parseEstimate(v: unknown): Estimate | undefined {
  if (!isRecord(v)) return undefined;
  const keys = Object.keys(ESTIMATE_MAX) as (keyof Estimate)[];
  if (!keys.every((k) => finite(v[k]))) return undefined;
  const e = Object.fromEntries(keys.map((k) => [k, round1(clamp(v[k] as number, 0, ESTIMATE_MAX[k]))])) as Estimate;
  return e.kcal > 0 ? e : undefined;
}

/** The "Other …" type for an unknown food: the model's pick, or the first of the same unit. */
function closestType(v: unknown, unit: unknown, catalogue: Map<string, CatalogueDish>): CatalogueDish | undefined {
  const picked = typeof v === 'string' ? catalogue.get(v) : undefined;
  if (picked?.generic) return picked;
  const types = [...catalogue.values()].filter((d) => d.generic);
  return types.find((d) => d.unit === unit) ?? types[0];
}

/**
 * Validate the model's answer. Unknown dish ids become `dish_id: null` (the
 * name is kept, with the closest "Other …" type and the estimate), units are
 * taken from the catalogue (the numbers are per catalogue unit), and numbers
 * are clamped. Throws ScanContractError when the answer isn't usable at all.
 */
export function parseScanOutput(raw: unknown, catalogue: Map<string, CatalogueDish>): ScanResponse {
  if (!isRecord(raw) || typeof raw.shared_table !== 'boolean' || !Array.isArray(raw.items)) {
    throw new ScanContractError('answer is not a scan result');
  }

  const items: ScanItem[] = [];
  for (const it of raw.items.slice(0, MAX_ITEMS)) {
    if (!isRecord(it) || !finite(it.qty) || !finite(it.confidence)) continue;
    const found = typeof it.dish_id === 'string' ? catalogue.get(it.dish_id) : undefined;
    // An "Other …" type given as the dish means the food isn't in the catalogue.
    const dish = found?.generic ? undefined : found;
    const name = typeof it.name === 'string' ? it.name.trim().slice(0, 80) : '';
    if (!dish && !name) continue;
    if (dish) {
      items.push({ dish_id: dish.id, qty: roundQty(it.qty), unit: dish.unit, confidence: clamp(it.confidence, 0, 1) });
      continue;
    }
    const type = closestType(found?.id ?? it.closest, it.unit, catalogue);
    const nameMy = typeof it.name_my === 'string' ? it.name_my.trim().slice(0, 80) : '';
    const estimate = parseEstimate(it.estimate);
    items.push({
      dish_id: null,
      name,
      ...(nameMy && { name_my: nameMy }),
      ...(type && { closest: type.id }),
      ...(estimate && { estimate }),
      qty: roundQty(it.qty),
      unit: type?.unit ?? (UNITS.includes(it.unit as Unit) ? (it.unit as Unit) : 'piece'),
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

/**
 * The catalogue for the prompt, one line per dish ("id | Burmese | English |
 * unit"), then the "Other …" types for foods not in it.
 */
export function catalogueLines(dishes: CatalogueDish[]): string {
  const line = (d: CatalogueDish) => `${d.id} | ${d.name_my} | ${d.name_en} | ${d.unit}`;
  const sorted = [...dishes].sort((a, b) => a.id.localeCompare(b.id));
  return [
    ...sorted.filter((d) => !d.generic).map(line),
    '',
    'Types for food not in the catalogue (use only in "closest"):',
    ...sorted.filter((d) => d.generic).map(line),
  ].join('\n');
}
