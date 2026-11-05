import { parseScanOutput, SCAN_OUTPUT_SCHEMA, type CatalogueDish } from '../functions/_shared/scanContract';
import {
  costUsd,
  geminiRequest,
  geminiThinking,
  MOCK_ANSWERS,
  MOCK_MODEL,
  mockVisionAnswer,
  providerOf,
  readGeminiResponse,
  toGeminiSchema,
} from '../functions/_shared/vision';

describe('providerOf', () => {
  it('picks the provider from the model name', () => {
    expect(providerOf('claude-haiku-5-5')).toBe('anthropic');
    expect(providerOf('gemini-2.5-flash-lite')).toBe('gemini');
    expect(providerOf('gpt-5.4-nano')).toBeNull();
  });
});

describe('toGeminiSchema', () => {
  const schema = toGeminiSchema(SCAN_OUTPUT_SCHEMA) as {
    type: string;
    properties: { items: { items: { properties: Record<string, Record<string, unknown>>; propertyOrdering: string[] } } };
  };
  const item = schema.properties.items.items;

  it('uses Gemini types and keeps the property order', () => {
    expect(schema.type).toBe('OBJECT');
    expect(item.propertyOrdering).toEqual(['dish_id', 'name', 'name_my', 'closest', 'estimate', 'qty', 'unit', 'confidence']);
    expect(item.properties.estimate).toMatchObject({ type: 'OBJECT', nullable: true });
    expect(item.properties.unit).toEqual({ type: 'STRING', enum: ['plate', 'bowl', 'spoon', 'piece', 'cup'] });
  });

  it('turns a null branch into nullable and drops additionalProperties', () => {
    expect(item.properties.dish_id).toEqual({ type: 'STRING', nullable: true });
    expect(JSON.stringify(schema)).not.toContain('additionalProperties');
  });
});

describe('geminiRequest', () => {
  const body = (thinking?: Record<string, unknown>) =>
    geminiRequest({ system: 'rules', imageBase64: 'AAA', prompt: 'what?', schema: SCAN_OUTPUT_SCHEMA, thinking });

  it('puts the cacheable rules first and the photo with the question', () => {
    const b = body();
    expect(b.systemInstruction).toEqual({ parts: [{ text: 'rules' }] });
    expect(b.contents[0].parts).toEqual([{ inlineData: { mimeType: 'image/jpeg', data: 'AAA' } }, { text: 'what?' }]);
    expect(b.generationConfig.responseMimeType).toBe('application/json');
  });

  it('sends a thinking setting only when there is one', () => {
    expect(body({ thinkingLevel: 'minimal' }).generationConfig).toMatchObject({ thinkingConfig: { thinkingLevel: 'minimal' } });
    expect(body().generationConfig).not.toHaveProperty('thinkingConfig');
  });

  it('asks for the least thinking at low effort, the way each generation accepts', () => {
    // Gemini 3.x answers 400 to thinkingBudget 0 (checked 2026-11-01).
    expect(geminiThinking('gemini-2.5-flash', 'low')).toEqual({ thinkingBudget: 0 });
    expect(geminiThinking('gemini-3.5-flash-lite', 'low')).toEqual({ thinkingLevel: 'minimal' });
    expect(geminiThinking('gemini-3.5-flash-lite', 'medium')).toBeUndefined();
  });
});

describe('readGeminiResponse', () => {
  const usageMetadata = { promptTokenCount: 1500, cachedContentTokenCount: 1200, candidatesTokenCount: 60, thoughtsTokenCount: 10 };

  it('reads the text and splits cached from new input tokens', () => {
    const res = readGeminiResponse(
      {
        candidates: [{ content: { parts: [{ text: 'thinking', thought: true }, { text: '{"items":[]}' }] }, finishReason: 'STOP' }],
        usageMetadata,
        modelVersion: 'gemini-2.5-flash-lite',
      },
      'gemini-2.5-flash-lite',
    );
    expect(res).toEqual({
      ok: true,
      text: '{"items":[]}',
      model: 'gemini-2.5-flash-lite',
      usage: { input: 300, output: 70, cacheRead: 1200, cacheWrite: 0 },
    });
  });

  it('reports cut-off, blocked and empty answers', () => {
    const cand = (finishReason: string) => ({ candidates: [{ content: { parts: [{ text: '{' }] }, finishReason }] });
    expect(readGeminiResponse(cand('MAX_TOKENS'), 'm')).toMatchObject({ ok: false, reason: 'truncated' });
    expect(readGeminiResponse(cand('SAFETY'), 'm')).toMatchObject({ ok: false, reason: 'refused' });
    expect(readGeminiResponse({ promptFeedback: { blockReason: 'OTHER' } }, 'm')).toMatchObject({ ok: false, reason: 'refused' });
    expect(readGeminiResponse({ candidates: [] }, 'm')).toMatchObject({ ok: false, reason: 'no_answer' });
    expect(readGeminiResponse(null, 'm')).toMatchObject({ ok: false, reason: 'no_answer', model: 'm' });
  });
});

describe('costUsd', () => {
  it('prices by the answering model, else the one asked for', () => {
    const u = { input: 700, output: 400, cacheRead: 4000, cacheWrite: 0 };
    // 700 × $0.10 + 400 × $0.40 + 4000 × $0.01 per million tokens.
    expect(costUsd(['gemini-2.5-flash-lite-preview', 'gemini-2.5-flash-lite'], u)).toBeCloseTo(0.00027);
    expect(costUsd(['unknown'], u)).toBeNull();
  });
});

describe('SCAN_MODEL=mock', () => {
  const { dishes } = jest.requireActual<typeof import('@/data/dishes')>('@/data/dishes');
  const catalogue = new Map<string, CatalogueDish>(
    Object.values(dishes).map((d) => [
      d.id,
      { id: d.id, name_my: d.name.my, name_en: d.name.en, unit: d.unit, ...(d.generic && { generic: true }) },
    ]),
  );

  it('is its own provider and costs nothing', () => {
    expect(providerOf(MOCK_MODEL)).toBe('mock');
    expect(costUsd([MOCK_MODEL], { input: 1000, output: 1000, cacheRead: 1000, cacheWrite: 1000 })).toBe(0);
  });

  it('gives every mock answer in a shape the real answer check accepts', () => {
    for (const answer of MOCK_ANSWERS) {
      const scan = parseScanOutput(JSON.parse(JSON.stringify(answer)), catalogue);
      expect(scan.items).toHaveLength(answer.items.length);
      // Every catalogue dish in a mock answer exists (no silent "not on the list").
      answer.items.filter((i) => i.dish_id).forEach((i, n) => expect(scan.items[n].dish_id).toBe(i.dish_id));
    }
  });

  it('answers the same photo the same way, and different photos differently', () => {
    const photo = (seed: number) => Uint8Array.from({ length: 4000 }, (_, i) => (i * seed) % 251);
    const text = (seed: number) => (mockVisionAnswer(photo(seed)) as { text: string }).text;
    expect(text(7)).toBe(text(7));
    expect(new Set([1, 2, 3, 5, 7, 11, 13, 17].map(text)).size).toBeGreaterThan(1);
    expect(mockVisionAnswer(photo(3))).toMatchObject({ ok: true, model: MOCK_MODEL });
  });
});
