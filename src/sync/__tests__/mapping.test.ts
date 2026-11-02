import { dishes } from '@/data/dishes';
import type { OnboardingDraft } from '@/store/onboarding';

import {
  dishFromServer,
  isNewer,
  logFromServer,
  logToServer,
  passesUntil,
  profileFromServer,
  profileToServer,
  weightFromServer,
  weightToServer,
  type LocalItemRow,
  type LocalLogRow,
  type ProfileSource,
} from '../mapping';

const draft: OnboardingDraft = {
  sex: 'female',
  birthYear: '1992',
  heightFt: '5',
  heightIn: '3',
  weightLb: '142.5',
  workday: 'shop',
  goal: 'lose',
  healthFlags: ['bloodSugar'],
  targetWeightLb: 130,
  pace: 1,
  eatingPlaces: ['teaShop', 'homeShared'],
};

const source: ProfileSource = {
  draft,
  completed: true,
  language: 'my',
  uposathaVegetarian: false,
  plan: { kcal: 1612.4, ricePlates: 3, proteinG: 103.6, fatG: 44.8, carbG: 199.2 },
};

describe('weights', () => {
  it.each([150, 150.4, 99.9, 312.7, 60])('keeps %p lb through kg and back', (lb) => {
    const back = weightFromServer(
      weightToServer({ day: '2026-10-30', weight_lb: lb, waist_in: null, updated_at: 'x', deleted_at: null }),
    );
    expect(back.weight_lb).toBe(lb);
  });

  it.each([32, 32.5, 28.25, 41.1])('keeps %p in waist through cm and back', (inches) => {
    const back = weightFromServer(
      weightToServer({ day: '2026-10-30', weight_lb: null, waist_in: inches, updated_at: 'x', deleted_at: null }),
    );
    expect(back.waist_in).toBe(inches);
  });

  it('accepts numbers sent as strings', () => {
    expect(
      weightFromServer({ day: 'd', weight_kg: '68.039' as never, waist_cm: null, updated_at: 'x', deleted_at: null })
        .weight_lb,
    ).toBe(150);
  });
});

describe('meals', () => {
  const row: LocalLogRow = {
    id: 'a0000000-0000-4000-8000-000000000001',
    eaten_at: '2026-10-30T01:00:00.000Z',
    source: 'photo',
    status: 'done',
    remote_photo: 'u/a0000000-0000-4000-8000-000000000001.jpg',
    is_shared_meal: 1,
    confidence: 0.8,
    candidates: JSON.stringify([{ dishId: 'porkCurry', confidence: 0.3 }]),
    updated_at: '2026-10-30T01:00:00.000Z',
    deleted_at: null,
  };
  const unknownFood = {
    name: { en: 'Pork leg stew', my: 'ဝက်ခြေထောက်ဟင်း' },
    kcal: 95,
    carbG: 2,
    proteinG: 7,
    fatG: 6.5,
  };
  const items: LocalItemRow[] = [
    { dish_id: 'rice', qty: 1.5, oil: null, sweetness: null, custom: null },
    { dish_id: 'chickenCurry', qty: 4, oil: 'more', sweetness: null, custom: null },
    { dish_id: 'otherMeatCurry', qty: 2, oil: null, sweetness: null, custom: JSON.stringify(unknownFood) },
  ];

  it('sends finished meals with their items and server photo path', () => {
    const server = logToServer(row, items)!;
    expect(server.photo_path).toBe(row.remote_photo);
    expect(server.is_shared_meal).toBe(true);
    expect(server.candidates).toEqual([{ dishId: 'porkCurry', confidence: 0.3 }]);
    expect(server.items[0]).toEqual({ dish_id: 'rice', qty: 1.5, oil: null, sweetness: null, custom: null });
    expect(server.items[2].custom).toEqual({
      name_en: 'Pork leg stew',
      name_my: 'ဝက်ခြေထောက်ဟင်း',
      kcal: 95,
      carb_g: 2,
      protein_g: 7,
      fat_g: 6.5,
    });
  });

  it('holds back photos still waiting for their scan, but not their deletion', () => {
    expect(logToServer({ ...row, status: 'queued' }, [])).toBeNull();
    expect(logToServer({ ...row, status: 'queued', deleted_at: '2026-10-30T02:00:00.000Z' }, [])).not.toBeNull();
  });

  it('round-trips a meal', () => {
    const server = logToServer(row, items)!;
    const back = logFromServer({ ...server, eaten_at: '2026-10-30T01:00:00+00:00', items: server.items });
    expect(back.row).toEqual(row);
    expect(back.items).toEqual(items);
  });
});

describe('profile', () => {
  it('is not sent before onboarding is finished', () => {
    expect(profileToServer({ ...source, draft: { ...draft, sex: null } }, 'now')).toBeNull();
  });

  it('converts to metric for the server', () => {
    const p = profileToServer(source, '2026-10-30T00:00:00.000Z')!;
    expect(p.height_cm).toBe(160.02);
    expect(p.weight_kg).toBe(64.637);
    expect(p.pace_kg_week).toBe(0.454);
    expect(p.kcal_target).toBe(1612);
    expect(p.onboarded).toBe(true);
  });

  it('comes back as the answers the screens store', () => {
    const back = profileFromServer(profileToServer(source, 'now')!);
    expect(back.draft).toEqual(draft);
    expect(back).toMatchObject({ completed: true, language: 'my', uposathaVegetarian: false });
  });

  it.each([0.5, 1, 2] as const)('keeps pace %p lb/week', (pace) => {
    const back = profileFromServer(profileToServer({ ...source, draft: { ...draft, pace } }, 'now')!);
    expect(back.draft.pace).toBe(pace);
  });
});

describe('dishes', () => {
  it('maps a server dish to the app shape', () => {
    const d = dishFromServer({
      id: 'tea',
      name_my: 'လက်ဖက်ရည်',
      name_en: 'Milk tea',
      aliases_my: ['လက်ဖက်ရည်'],
      aliases_zawgyi: ['zawgyi-tea'],
      aliases_roman: ['laphet yay'],
      unit: 'cup',
      serving_g: '150' as never,
      kcal: '120.0' as never,
      carb_g: 18,
      protein_g: 3,
      fat_g: 4,
      sugar_g: '16.1' as never,
      sodium_mg: 61,
      oil_sensitive: false,
      has_sweetness: true,
      is_vegetarian: true,
      source: 'recipe',
      verified_at: null,
      deleted_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    });
    expect(d).toMatchObject({
      servingG: 150,
      kcal: 120,
      sugarG: 16.1,
      sodiumMg: 61,
      hasSweetness: true,
      verified: false,
      calculated: true,
      retired: true,
    });
    expect(d.aliasesMy).toContain('zawgyi-tea');
    expect(d.oilSensitive).toBeUndefined();
    expect(Object.keys(d)).toEqual(expect.arrayContaining(Object.keys(dishes.tea).filter((k) => k !== 'photo')));
  });

  it('leaves out missing grams, sugar and sodium, and guessed numbers are not calculated', () => {
    const d = dishFromServer({
      id: 'x',
      name_my: 'x',
      name_en: 'x',
      aliases_my: [],
      aliases_zawgyi: [],
      aliases_roman: [],
      unit: 'plate',
      serving_g: null,
      kcal: 100,
      carb_g: 10,
      protein_g: 5,
      fat_g: 4,
      sugar_g: null,
      sodium_mg: null,
      oil_sensitive: false,
      has_sweetness: false,
      is_vegetarian: false,
      source: 'illustrative placeholder',
      verified_at: null,
      deleted_at: null,
      updated_at: '2026-10-30T00:00:00Z',
    });
    expect(d.servingG).toBeUndefined();
    expect(d.sugarG).toBeUndefined();
    expect(d.sodiumMg).toBeUndefined();
    expect(d.calculated).toBeUndefined();
  });
});

describe('helpers', () => {
  it('compares times of different precision', () => {
    expect(isNewer('2026-10-30T01:00:00.000001+00:00', '2026-10-30T01:00:00.000Z')).toBe(false);
    expect(isNewer('2026-10-30T01:00:00.001+00:00', '2026-10-30T01:00:00.000Z')).toBe(true);
    expect(isNewer('2026-10-30T01:00:00Z', null)).toBe(true);
  });

  it('finds the end of chained passes', () => {
    const now = Date.parse('2026-11-15T00:00:00Z');
    const passes = [
      { starts_at: '2026-11-01T00:00:00Z', ends_at: '2026-12-01T00:00:00Z' },
      { starts_at: '2026-12-01T00:00:00Z', ends_at: '2027-03-01T00:00:00Z' },
    ];
    expect(passesUntil(passes, now)).toBe('2027-03-01T00:00:00.000Z');
    expect(passesUntil(passes, Date.parse('2027-04-01T00:00:00Z'))).toBeNull();
    expect(passesUntil([], now)).toBeNull();
  });
});
