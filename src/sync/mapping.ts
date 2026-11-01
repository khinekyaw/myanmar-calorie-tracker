import type { Sex, Workday } from '@/domain/nutrition';
import { PACES, type Goal, type Pace } from '@/domain/plan';
import { ftInToCm, kgToLb, lbToKg } from '@/domain/units';
import type { Language } from '@/i18n/languages';
import type { Dish, Unit } from '@/data/dishes';
import type { EatingPlace, HealthFlag, OnboardingDraft } from '@/store/onboarding';

/**
 * Pure conversions between phone rows and server rows (supabase/migrations).
 * The phone keeps the units people type (lb, in, ft/in); the server is metric.
 * Rounding is chosen so a value survives the round trip unchanged.
 */

const roundTo = (n: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

const num = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));

/** True when `a` is a later time than `b` (or `b` is missing). ISO strings of any precision. */
export const isNewer = (a: string, b: string | null | undefined) => !b || Date.parse(a) > Date.parse(b);

// ── Weights ──────────────────────────────────────────────────────────────

export type LocalWeightRow = {
  day: string;
  weight_lb: number | null;
  waist_in: number | null;
  updated_at: string;
  deleted_at: string | null;
};

export type ServerWeight = {
  day: string;
  weight_kg: number | null;
  waist_cm: number | null;
  updated_at: string;
  deleted_at: string | null;
};

export const weightToServer = (r: LocalWeightRow): ServerWeight => ({
  day: r.day,
  weight_kg: r.weight_lb === null ? null : roundTo(lbToKg(r.weight_lb), 3),
  waist_cm: r.waist_in === null ? null : roundTo(r.waist_in * 2.54, 2),
  updated_at: r.updated_at,
  deleted_at: r.deleted_at,
});

export const weightFromServer = (s: ServerWeight): LocalWeightRow => {
  const kg = num(s.weight_kg);
  const cm = num(s.waist_cm);
  return {
    day: s.day,
    weight_lb: kg === null ? null : roundTo(kgToLb(kg), 2),
    waist_in: cm === null ? null : roundTo(cm / 2.54, 2),
    updated_at: s.updated_at,
    deleted_at: s.deleted_at,
  };
};

// ── Meals ────────────────────────────────────────────────────────────────

export type LocalLogRow = {
  id: string;
  eaten_at: string;
  source: string;
  status: string;
  remote_photo: string | null;
  is_shared_meal: number;
  confidence: number | null;
  /** JSON text: [{ dishId, confidence }] */
  candidates: string | null;
  updated_at: string;
  deleted_at: string | null;
};

export type LocalItemRow = { dish_id: string; qty: number; oil: string | null; sweetness: string | null };

export type ServerLog = {
  id: string;
  eaten_at: string;
  source: string;
  status: string;
  photo_path: string | null;
  is_shared_meal: boolean;
  confidence: number | null;
  candidates: unknown[] | null;
  updated_at: string;
  deleted_at: string | null;
  items: LocalItemRow[];
};

/**
 * The server copy of a meal, or null when it shouldn't be sent yet: a photo
 * still waiting for its scan has nothing useful for other phones (it is sent
 * once its items are known, or as a tombstone if deleted first).
 */
export function logToServer(row: LocalLogRow, items: LocalItemRow[]): ServerLog | null {
  if (row.status !== 'done' && !row.deleted_at) return null;
  return {
    id: row.id,
    eaten_at: row.eaten_at,
    source: row.source,
    status: row.status,
    photo_path: row.remote_photo,
    is_shared_meal: Boolean(row.is_shared_meal),
    confidence: row.confidence,
    candidates: row.candidates ? (JSON.parse(row.candidates) as unknown[]) : null,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    items: items.map((i) => ({ dish_id: i.dish_id, qty: i.qty, oil: i.oil, sweetness: i.sweetness })),
  };
}

export function logFromServer(s: ServerLog): { row: LocalLogRow; items: LocalItemRow[] } {
  return {
    row: {
      id: s.id,
      eaten_at: new Date(s.eaten_at).toISOString(),
      source: s.source,
      status: s.status,
      remote_photo: s.photo_path,
      is_shared_meal: s.is_shared_meal ? 1 : 0,
      confidence: num(s.confidence),
      candidates: s.candidates ? JSON.stringify(s.candidates) : null,
      updated_at: s.updated_at,
      deleted_at: s.deleted_at,
    },
    items: s.items.map((i) => ({ dish_id: i.dish_id, qty: Number(i.qty), oil: i.oil, sweetness: i.sweetness })),
  };
}

// ── Profile ──────────────────────────────────────────────────────────────

export type ProfileSource = {
  draft: OnboardingDraft;
  completed: boolean;
  language: Language;
  uposathaVegetarian: boolean;
  plan: { kcal: number; ricePlates: number; proteinG: number; fatG: number; carbG: number };
};

export type ServerProfile = {
  onboarded: boolean;
  sex: Sex | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  workday: Workday | null;
  goal: Goal | null;
  target_weight_kg: number | null;
  pace_kg_week: number | null;
  health_flags: HealthFlag[];
  eating_places: EatingPlace[];
  language: Language;
  uposatha_vegetarian: boolean;
  kcal_target: number | null;
  rice_plates_target: number | null;
  protein_g_target: number | null;
  fat_g_target: number | null;
  carb_g_target: number | null;
  updated_at: string;
};

/** Enough answers to compute a plan (same rule as draftToPlanInput). */
export const isProfileComplete = (d: OnboardingDraft) =>
  Boolean(d.sex && d.workday && d.goal && d.birthYear && d.heightFt && d.weightLb);

/**
 * The server copy of the profile, or null while onboarding is unfinished:
 * a half-filled profile must never overwrite a real one (e.g. "I have an
 * account" on a new phone, before the account's profile has arrived).
 */
export function profileToServer(src: ProfileSource, updatedAt: string): ServerProfile | null {
  const d = src.draft;
  if (!isProfileComplete(d)) return null;
  const weightLb = Number(d.weightLb);
  return {
    onboarded: src.completed,
    sex: d.sex,
    birth_year: Number(d.birthYear),
    height_cm: roundTo(ftInToCm(Number(d.heightFt), Number(d.heightIn || 0)), 2),
    weight_kg: roundTo(lbToKg(weightLb), 3),
    workday: d.workday,
    goal: d.goal,
    target_weight_kg: d.targetWeightLb === null ? null : roundTo(lbToKg(d.targetWeightLb), 3),
    pace_kg_week: roundTo(lbToKg(d.pace), 3),
    health_flags: d.healthFlags,
    eating_places: d.eatingPlaces,
    language: src.language,
    uposatha_vegetarian: src.uposathaVegetarian,
    kcal_target: Math.round(src.plan.kcal),
    rice_plates_target: roundTo(src.plan.ricePlates, 1),
    protein_g_target: Math.round(src.plan.proteinG),
    fat_g_target: Math.round(src.plan.fatG),
    carb_g_target: Math.round(src.plan.carbG),
    updated_at: updatedAt,
  };
}

const nearestPace = (lbPerWeek: number): Pace =>
  PACES.reduce((best, p) => (Math.abs(p - lbPerWeek) < Math.abs(best - lbPerWeek) ? p : best), PACES[0]);

/** Onboarding answers (as the screens store them) from the server copy. */
export function profileFromServer(p: ServerProfile): {
  draft: Partial<OnboardingDraft>;
  completed: boolean;
  language: Language;
  uposathaVegetarian: boolean;
} {
  const heightCm = num(p.height_cm);
  const totalIn = heightCm === null ? null : Math.round(heightCm / 2.54);
  const weightKg = num(p.weight_kg);
  const targetKg = num(p.target_weight_kg);
  const paceKg = num(p.pace_kg_week);
  return {
    draft: {
      sex: p.sex,
      birthYear: p.birth_year === null ? '' : String(p.birth_year),
      heightFt: totalIn === null ? '' : String(Math.floor(totalIn / 12)),
      heightIn: totalIn === null ? '' : String(totalIn % 12),
      weightLb: weightKg === null ? '' : String(roundTo(kgToLb(weightKg), 1)),
      workday: p.workday,
      goal: p.goal,
      healthFlags: p.health_flags ?? [],
      targetWeightLb: targetKg === null ? null : roundTo(kgToLb(targetKg), 1),
      pace: paceKg === null ? 1 : nearestPace(kgToLb(paceKg)),
      eatingPlaces: p.eating_places ?? [],
    },
    completed: p.onboarded,
    language: p.language,
    uposathaVegetarian: p.uposatha_vegetarian,
  };
}

// ── Dish catalogue ───────────────────────────────────────────────────────

export type ServerDish = {
  id: string;
  name_my: string;
  name_en: string;
  aliases_my: string[];
  aliases_zawgyi: string[];
  aliases_roman: string[];
  unit: Unit;
  kcal: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  sugar_g: number | null;
  sodium_mg: number | null;
  oil_sensitive: boolean;
  has_sweetness: boolean;
  is_vegetarian: boolean;
  source: string | null;
  verified_at: string | null;
  deleted_at: string | null;
  updated_at: string;
};

/** `dishes.source` for numbers from the recipe calculation (docs/CATALOGUE.md). */
export const RECIPE_SOURCE = 'recipe';

/** A catalogue dish as the app uses it (photos stay bundled, matched by id). */
export function dishFromServer(d: ServerDish): Dish {
  return {
    id: d.id,
    name: { my: d.name_my, en: d.name_en },
    aliasesRoman: d.aliases_roman ?? [],
    // Zawgyi spellings are matched like any other Burmese alias.
    aliasesMy: [...(d.aliases_my ?? []), ...(d.aliases_zawgyi ?? [])],
    unit: d.unit,
    kcal: Number(d.kcal),
    carbG: Number(d.carb_g),
    proteinG: Number(d.protein_g),
    fatG: Number(d.fat_g),
    ...(d.sugar_g !== null && d.sugar_g !== undefined && { sugarG: Number(d.sugar_g) }),
    ...(d.sodium_mg !== null && d.sodium_mg !== undefined && { sodiumMg: Number(d.sodium_mg) }),
    ...(d.oil_sensitive && { oilSensitive: true }),
    ...(d.has_sweetness && { hasSweetness: true }),
    ...(d.is_vegetarian && { isVegetarian: true }),
    verified: d.verified_at !== null,
    ...(d.source === RECIPE_SOURCE && { calculated: true }),
    ...(d.deleted_at !== null && { retired: true }),
  };
}

// ── Premium ──────────────────────────────────────────────────────────────

/** End of the current Premium time, or null. Passes chain end to start, so it is the last end. */
export function passesUntil(passes: { starts_at: string; ends_at: string }[], now = Date.now()): string | null {
  const active = passes.some((p) => Date.parse(p.starts_at) <= now && Date.parse(p.ends_at) > now);
  if (!active) return null;
  return new Date(Math.max(...passes.map((p) => Date.parse(p.ends_at)))).toISOString();
}
