/**
 * The vision model behind the scan is a setting (SCAN_MODEL): `claude-*` goes
 * to Anthropic, `gemini-*` to Google's Gemini API. Both answer in the same
 * shape (VisionAnswer). Pure TypeScript with no imports, so Jest can test the
 * Gemini request and response handling; the `scan` function makes the calls.
 */

export type Provider = 'anthropic' | 'gemini';

export function providerOf(model: string): Provider | null {
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'gemini';
  return null;
}

/** Tokens of one call. `input` excludes cached tokens; `output` includes thinking. */
export type VisionUsage = { input: number; output: number; cacheRead: number; cacheWrite: number };

export type VisionAnswer =
  | { ok: true; text: string; model: string; usage: VisionUsage }
  | { ok: false; reason: 'refused' | 'truncated' | 'no_answer'; detail: string; model: string; usage: VisionUsage | null };

/**
 * USD per million tokens: input, output, cache read, cache write. Used for the
 * cost log only. Check claude.com/pricing and ai.google.dev/gemini-api/docs/pricing
 * when adding a model. Gemini's implicit caching has no write charge.
 */
export const PRICES: Record<string, [number, number, number, number]> = {
  'claude-opus-5-5': [4, 20, 0.2, 5],
  'claude-opus-5': [5, 25, 0.5, 6.25],
  'claude-opus-4-8': [5, 25, 0.5, 6.25],
  'claude-sonnet-5-5': [2, 10, 0.1, 2.5],
  'claude-haiku-5-5': [0.1, 0.5, 0.01, 0.125],
  'gemini-2.5-flash-lite': [0.1, 0.4, 0.01, 0],
  'gemini-2.5-flash': [0.3, 2.5, 0.03, 0],
  'gemini-3.1-flash-lite': [0.25, 1.5, 0.025, 0],
  'gemini-3.5-flash-lite': [0.3, 2.5, 0.03, 0],
};

/** Cost of one call, priced by the model that answered, else the one asked for. */
export function costUsd(models: string[], u: VisionUsage): number | null {
  const p = models.map((m) => PRICES[m]).find(Boolean);
  if (!p) return null;
  return (u.input * p[0] + u.output * p[1] + u.cacheRead * p[2] + u.cacheWrite * p[3]) / 1_000_000;
}

export type JsonSchema = {
  type?: string;
  anyOf?: readonly JsonSchema[];
  enum?: readonly string[];
  properties?: { readonly [key: string]: JsonSchema };
  required?: readonly string[];
  items?: JsonSchema;
  additionalProperties?: boolean;
};

/**
 * Gemini's `responseSchema` takes an OpenAPI-style subset: nullable instead of
 * a null branch, no additionalProperties. Property order is kept so the
 * answer comes back in the same order as for Claude.
 */
export function toGeminiSchema(s: JsonSchema): Record<string, unknown> {
  const branches = s.anyOf?.filter((b) => b.type !== 'null');
  if (branches && branches.length === 1) {
    return { ...toGeminiSchema(branches[0]), nullable: true };
  }
  const out: Record<string, unknown> = {};
  if (s.type) out.type = s.type.toUpperCase();
  if (s.enum) out.enum = [...s.enum];
  if (s.properties) {
    out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)]));
    out.propertyOrdering = Object.keys(s.properties);
  }
  if (s.required) out.required = [...s.required];
  if (s.items) out.items = toGeminiSchema(s.items);
  return out;
}

/**
 * Least thinking for `low` effort: Gemini 2.5 turns it off with a zero
 * budget, Gemini 3 and later reject that and take a level instead.
 * Other efforts use the model's default.
 */
export function geminiThinking(model: string, effort: string): Record<string, unknown> | undefined {
  if (effort !== 'low') return undefined;
  return model.startsWith('gemini-2.') ? { thinkingBudget: 0 } : { thinkingLevel: 'minimal' };
}

/** Body for POST v1beta/models/{model}:generateContent. */
export function geminiRequest(p: {
  system: string;
  imageBase64: string;
  prompt: string;
  schema: JsonSchema;
  /** From geminiThinking(). */
  thinking?: Record<string, unknown>;
}) {
  return {
    // Same text for every scan and placed first, so Gemini's implicit cache can reuse it.
    systemInstruction: { parts: [{ text: p.system }] },
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: { mimeType: 'image/jpeg', data: p.imageBase64 } }, { text: p.prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(p.schema),
      maxOutputTokens: 4096,
      ...(p.thinking && { thinkingConfig: p.thinking }),
    },
  };
}

type GeminiPart = { text?: string; thought?: boolean };
type GeminiBody = {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  modelVersion?: string;
};

/** Turn a generateContent response into a VisionAnswer. */
export function readGeminiResponse(raw: unknown, requested: string): VisionAnswer {
  const body = (raw ?? {}) as GeminiBody;
  const model = body.modelVersion ?? requested;
  const m = body.usageMetadata;
  const usage: VisionUsage | null = m
    ? {
        input: (m.promptTokenCount ?? 0) - (m.cachedContentTokenCount ?? 0),
        output: (m.candidatesTokenCount ?? 0) + (m.thoughtsTokenCount ?? 0),
        cacheRead: m.cachedContentTokenCount ?? 0,
        cacheWrite: 0,
      }
    : null;

  if (body.promptFeedback?.blockReason) {
    return { ok: false, reason: 'refused', detail: `blocked: ${body.promptFeedback.blockReason}`, model, usage };
  }
  const candidate = body.candidates?.[0];
  if (!candidate) return { ok: false, reason: 'no_answer', detail: 'no candidates', model, usage };
  if (candidate.finishReason === 'MAX_TOKENS') {
    return { ok: false, reason: 'truncated', detail: 'answer cut off', model, usage };
  }
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    return { ok: false, reason: 'refused', detail: `finish: ${candidate.finishReason}`, model, usage };
  }
  const text = (candidate.content?.parts ?? [])
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('');
  if (!text) return { ok: false, reason: 'no_answer', detail: 'no text in answer', model, usage };
  return { ok: true, text, model, usage: usage ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
}
