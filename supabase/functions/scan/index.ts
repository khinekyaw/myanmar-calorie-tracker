// Photo scan: identify Myanmar dishes in a meal photo (docs/BACKEND.md).
//
// POST { log_id, taken_at } with the user's JWT. The app uploads the photo
// to meal-photos/<user id>/<log id>.jpg first. Steps: use one free scan
// (atomic, skipped for Premium) → photo + catalogue to the vision model (Claude or
// Gemini, by SCAN_MODEL) → validate the
// JSON → record cost → { scan: ScanResponse, scans_left }.
//
// Retry-safe: the same log_id is never charged twice, and a scan that already
// succeeded returns the stored answer. A failed scan gives the free scan back.
//
// Responses: 200 ok · 400 bad request · 402 no free scans · 404 photo not uploaded
// · 409 already scanning · 502 scan failed (retry later) · 503 not configured / over budget

import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { withSupabase, type SupabaseContext } from 'npm:@supabase/server@1.9.2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

import {
  catalogueLines,
  parseScanOutput,
  SCAN_OUTPUT_SCHEMA,
  type CatalogueDish,
} from '../_shared/scanContract.ts';
import {
  costUsd,
  geminiRequest,
  geminiThinking,
  providerOf,
  readGeminiResponse,
  type VisionAnswer,
  type VisionUsage,
} from '../_shared/vision.ts';

type SupabaseAdmin = SupabaseContext['supabaseAdmin'];
type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

// Any `claude-*` or `gemini-*` model id; the provider follows from the name.
// Haiku: the cheapest Claude for picking dishes from a fixed list (reports/Scan model
// choice.md). Compare others on the labelled photo set by changing this setting.
const MODEL = Deno.env.get('SCAN_MODEL') ?? 'claude-haiku-5-5';
const PROVIDER = providerOf(MODEL);
// Haiku has no server-side refusal fallback; the parameter only helps the larger models.
const SERVER_FALLBACK = !MODEL.startsWith('claude-haiku');
// Identifying a dish is a short perception task, and people wait on the
// Result screen, so effort defaults low. Tune with the labelled photo set.
const EFFORT = (Deno.env.get('SCAN_EFFORT') ?? 'low') as Effort;
// Free scans a day: more in an account's first week, then fewer (reports/Unit economics.md).
const FREE_SCANS_FIRST_WEEK = Number(Deno.env.get('FREE_SCANS_FIRST_WEEK') ?? 3);
const FREE_SCANS_PER_DAY = Number(Deno.env.get('FREE_SCANS_PER_DAY') ?? 1);
const DAILY_BUDGET_USD = Deno.env.get('SCAN_DAILY_BUDGET_USD')
  ? Number(Deno.env.get('SCAN_DAILY_BUDGET_USD'))
  : null;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
// Use a key from a Gemini project with billing on: on the free tier Google may
// use and have people review what is sent (ai.google.dev/gemini-api/terms).
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYSTEM_RULES = `You identify food in meal photos for Sar AI, a calorie-tracking app used in Myanmar.

Match what you see to dishes in the catalogue below and estimate how much is in the photo, counted in each dish's catalogue unit:
- plate: a plate of rice (about 200 g cooked); use halves, e.g. 1.5
- bowl: a bowl (soup, noodles such as mohinga)
- spoon: a serving spoon of curry or a side dish
- piece: one piece (palata, samosa, fritter)
- cup: one cup (tea, coffee)

Rules:
- dish_id must be an id from the catalogue. Otherwise "name" is the catalogue English name, and name_my, closest and estimate are empty ("", null, null).
- If a food is clearly not in the catalogue, set dish_id to null, name it in English in "name" and in Burmese in "name_my" ("" if you don't know it), set "closest" to the type below that fits it best, and give qty in that type's unit. In "estimate", give your best estimate of kcal, carb_g, protein_g and fat_g for ONE unit of it as served in Myanmar.
- confidence (0 to 1) is how sure you are that the dish is right.
- shared_table is true when several curries and sides are laid out to share, usually around rice (a family table, ဝိုင်းစား). List every dish on the table then, with rice in plates and each curry in spoons.
- When the photo shows one main dish and you are not sure what it is (confidence below 0.6), put up to 3 likely catalogue dishes in "candidates", most likely first. Otherwise leave candidates empty.
- Look closely for toppings and sides: they change the calories a lot. Those that are catalogue dishes of their own are separate items, each in its own unit: fritters on mohinga or noodles (split pea fritter, gourd fritter, onion fritter, also when broken into pieces), boiled eggs on mohinga or noodles, a fried or boiled egg on rice, fried fish next to a curry. Count them (e.g. 2 pieces).
- A catalogue dish already includes its usual garnish: herbs, lime, sliced onion, fried garlic, chilli flakes, and HALF a boiled egg in mohinga. Don't list those, but list anything beyond them: mohinga with 2 whole eggs (4 halves) is mohinga 1 bowl + boiled egg 1.5 pieces.
- One bowl or plate with toppings is not a shared table.
- If there is no food in the photo, return an empty items list.
- Curries are cooked with the usual amount of oil; don't adjust for oil.

Catalogue (id | Burmese | English | unit):
`;

const anthropic =
  PROVIDER === 'anthropic' && ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 45_000, maxRetries: 1 })
    : null;
const configured = PROVIDER === 'anthropic' ? anthropic !== null : PROVIDER === 'gemini' && Boolean(GEMINI_API_KEY);

const PROMPT = 'What food is in this photo, and how much?';

async function askClaude(system: string, image: string): Promise<VisionAnswer> {
  const message = await anthropic!.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    ...(SERVER_FALLBACK && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
    output_config: { effort: EFFORT, format: { type: 'json_schema', schema: SCAN_OUTPUT_SCHEMA } },
    // Rules + catalogue are identical for every scan: cache them.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  });
  const u = message.usage;
  const usage: VisionUsage = {
    input: u.input_tokens,
    output: u.output_tokens,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
  };
  const model = message.model;
  if (message.stop_reason === 'refusal') return { ok: false, reason: 'refused', detail: 'model declined the photo', model, usage };
  if (message.stop_reason === 'max_tokens') return { ok: false, reason: 'truncated', detail: 'answer cut off', model, usage };
  const text = message.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') return { ok: false, reason: 'no_answer', detail: 'no text in answer', model, usage };
  return { ok: true, text: text.text, model, usage };
}

async function askGemini(system: string, image: string): Promise<VisionAnswer> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY! },
    body: JSON.stringify(
      geminiRequest({
        system,
        imageBase64: image,
        prompt: PROMPT,
        schema: SCAN_OUTPUT_SCHEMA,
        thinking: geminiThinking(MODEL, EFFORT),
      }),
    ),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message ?? '';
    throw new ScanFailure(502, 'ai_error', `gemini ${res.status} ${message}`.trim());
  }
  return readGeminiResponse(body, MODEL);
}

// The catalogue changes rarely; warm workers reuse it for 10 minutes.
let catalogueCache: { at: number; dishes: CatalogueDish[] } | null = null;

async function loadCatalogue(admin: SupabaseAdmin): Promise<CatalogueDish[]> {
  if (catalogueCache && Date.now() - catalogueCache.at < 10 * 60_000) return catalogueCache.dishes;
  const { data, error } = await admin
    .from('dishes')
    .select('id, name_my, name_en, unit, source')
    .is('deleted_at', null)
    .order('id');
  if (error) throw new Error(`catalogue: ${error.message}`);
  const dishes = (data as (CatalogueDish & { source: string | null })[]).map(({ source, ...d }) => ({
    ...d,
    ...(source === 'generic' && { generic: true }),
  }));
  catalogueCache = { at: Date.now(), dishes };
  return catalogueCache.dishes;
}

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

class ScanFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export default {
  fetch: withSupabase({ auth: 'user', cors: 'disabled' }, async (req, ctx) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
    const userId = ctx.userClaims!.id;
    const admin = ctx.supabaseAdmin;

    const body = (await req.json().catch(() => null)) as { log_id?: unknown; taken_at?: unknown } | null;
    const logId = typeof body?.log_id === 'string' && UUID.test(body.log_id) ? body.log_id.toLowerCase() : null;
    const takenAt = typeof body?.taken_at === 'string' && !Number.isNaN(Date.parse(body.taken_at)) ? body.taken_at : null;
    if (!logId) return json(400, { error: 'bad_request' });
    if (!configured) return json(503, { error: 'not_configured' });

    const allowance = await admin.rpc('free_scans_per_day', {
      p_user: userId,
      p_first_week: FREE_SCANS_FIRST_WEEK,
      p_after: FREE_SCANS_PER_DAY,
    });
    if (allowance.error) {
      console.error(JSON.stringify({ event: 'scan', step: 'allowance', error: allowance.error.message }));
      return json(500, { error: 'server_error' });
    }
    const freePerDay = allowance.data as number;

    const photoPath = `${userId}/${logId}.jpg`;
    const begin = await admin.rpc('begin_scan', {
      p_user: userId,
      p_log_id: logId,
      p_photo_path: photoPath,
      p_taken_at: takenAt,
      p_free_per_day: freePerDay,
      p_daily_budget_usd: DAILY_BUDGET_USD,
    });
    if (begin.error) {
      console.error(JSON.stringify({ event: 'scan', step: 'begin', error: begin.error.message }));
      return json(500, { error: 'server_error' });
    }
    const start = begin.data as { outcome: string; scans_left: number | null; response?: unknown };
    switch (start.outcome) {
      case 'cached':
        return json(200, { scan: start.response, scans_left: start.scans_left });
      case 'in_progress':
        return json(409, { error: 'in_progress', scans_left: start.scans_left });
      case 'quota_exceeded':
        return json(402, { error: 'quota_exceeded', scans_left: 0 });
      case 'budget_exceeded':
        return json(503, { error: 'busy', scans_left: start.scans_left });
    }

    const started = Date.now();
    let usage: VisionUsage | null = null;
    let servedBy: string | null = null;
    const finish = (ok: boolean, response: unknown, error: string | null) =>
      admin.rpc('finish_scan', {
        p_user: userId,
        p_log_id: logId,
        p_ok: ok,
        p_response: response,
        p_error: error,
        p_model: servedBy,
        p_input_tokens: usage?.input ?? null,
        p_output_tokens: usage?.output ?? null,
        p_cache_read_tokens: usage?.cacheRead ?? null,
        p_cache_write_tokens: usage?.cacheWrite ?? null,
        p_cost_usd: usage && servedBy ? costUsd([servedBy, MODEL], usage) : null,
        p_latency_ms: Date.now() - started,
        p_free_per_day: freePerDay,
      });

    try {
      const photo = await admin.storage.from('meal-photos').download(photoPath);
      if (photo.error || !photo.data) throw new ScanFailure(404, 'photo_missing', 'photo not uploaded');
      if (photo.data.size > MAX_PHOTO_BYTES) throw new ScanFailure(400, 'photo_too_large', 'photo too large');
      const image = encodeBase64(new Uint8Array(await photo.data.arrayBuffer()));

      const dishes = await loadCatalogue(admin);
      const system = SYSTEM_RULES + catalogueLines(dishes);
      const answer = PROVIDER === 'gemini' ? await askGemini(system, image) : await askClaude(system, image);
      usage = answer.usage;
      servedBy = answer.model;
      if (!answer.ok) throw new ScanFailure(502, answer.reason, answer.detail);

      const scan = parseScanOutput(JSON.parse(answer.text), new Map(dishes.map((d) => [d.id, d])));
      const done = await finish(true, scan, null);
      console.log(JSON.stringify({
        event: 'scan', outcome: 'ok', model: servedBy, ms: Date.now() - started,
        items: scan.items.length, input_tokens: answer.usage.input, output_tokens: answer.usage.output,
        cache_read: answer.usage.cacheRead,
      }));
      return json(200, { scan, scans_left: (done.data as { scans_left: number | null } | null)?.scans_left ?? null });
    } catch (e) {
      const failure =
        e instanceof ScanFailure
          ? e
          : e instanceof Anthropic.APIError
            ? new ScanFailure(502, 'ai_error', `${e.status ?? ''} ${e.message}`)
            : new ScanFailure(502, 'scan_failed', e instanceof Error ? e.message : String(e));
      const done = await finish(false, null, `${failure.code}: ${failure.message}`);
      console.error(JSON.stringify({
        event: 'scan', outcome: failure.code, model: servedBy, ms: Date.now() - started, error: failure.message,
      }));
      return json(failure.status, {
        error: failure.code,
        scans_left: (done.data as { scans_left: number | null } | null)?.scans_left ?? null,
      });
    }
  }),
};
