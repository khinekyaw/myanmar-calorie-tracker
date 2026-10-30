import type { Goal } from './plan';
import { goalProgress } from './progress';

/**
 * Milestone badges. Everything is worked out from what's already on the
 * phone (meals, weights, plan), so badges need no server and work offline.
 * Streak and weight badges look at the best ever reached, so a broken streak
 * or a bad week never takes a badge away.
 */

export type BadgeGroup = 'streak' | 'logging' | 'ways' | 'food' | 'balance' | 'body';

export const BADGE_GROUPS: BadgeGroup[] = ['streak', 'logging', 'ways', 'food', 'balance', 'body'];

export type BadgeId =
  | 'streak3'
  | 'streak7'
  | 'streak30'
  | 'streak100'
  | 'streak365'
  | 'meals1'
  | 'meals10'
  | 'meals50'
  | 'meals200'
  | 'meals500'
  | 'threeMeals'
  | 'firstScan'
  | 'firstVoice'
  | 'sharedTable'
  | 'mohingaMorning'
  | 'teaShop'
  | 'laphetLover'
  | 'riceInCheck'
  | 'onTarget'
  | 'proteinPower'
  | 'firstWeighIn'
  | 'weeklyCheckIn'
  | 'first5lb'
  | 'halfway'
  | 'goalReached';

type Rule =
  | { kind: 'streak' }
  | { kind: 'meals' }
  | { kind: 'threeMeals' }
  | { kind: 'source'; source: 'photo' | 'voice' }
  | { kind: 'shared' }
  | { kind: 'dish'; dishId: string; beforeHour?: number }
  | { kind: 'riceDays' }
  | { kind: 'kcalDays' }
  | { kind: 'proteinDays' }
  | { kind: 'weighIns' }
  | { kind: 'weighWeeks' }
  | { kind: 'lbTowardGoal' }
  | { kind: 'goalShare' };

export type BadgeDef = { id: BadgeId; group: BadgeGroup; target: number; rule: Rule };

/** Display order. `target` is the number shown in the rule text ("7 days in a row"). */
export const BADGES: BadgeDef[] = [
  { id: 'streak3', group: 'streak', target: 3, rule: { kind: 'streak' } },
  { id: 'streak7', group: 'streak', target: 7, rule: { kind: 'streak' } },
  { id: 'streak30', group: 'streak', target: 30, rule: { kind: 'streak' } },
  { id: 'streak100', group: 'streak', target: 100, rule: { kind: 'streak' } },
  { id: 'streak365', group: 'streak', target: 365, rule: { kind: 'streak' } },
  { id: 'meals1', group: 'logging', target: 1, rule: { kind: 'meals' } },
  { id: 'meals10', group: 'logging', target: 10, rule: { kind: 'meals' } },
  { id: 'meals50', group: 'logging', target: 50, rule: { kind: 'meals' } },
  { id: 'meals200', group: 'logging', target: 200, rule: { kind: 'meals' } },
  { id: 'meals500', group: 'logging', target: 500, rule: { kind: 'meals' } },
  { id: 'threeMeals', group: 'logging', target: 1, rule: { kind: 'threeMeals' } },
  { id: 'firstScan', group: 'ways', target: 1, rule: { kind: 'source', source: 'photo' } },
  { id: 'firstVoice', group: 'ways', target: 1, rule: { kind: 'source', source: 'voice' } },
  { id: 'sharedTable', group: 'ways', target: 5, rule: { kind: 'shared' } },
  { id: 'mohingaMorning', group: 'food', target: 5, rule: { kind: 'dish', dishId: 'mohinga', beforeHour: 12 } },
  { id: 'teaShop', group: 'food', target: 10, rule: { kind: 'dish', dishId: 'tea' } },
  { id: 'laphetLover', group: 'food', target: 5, rule: { kind: 'dish', dishId: 'laphetThoke' } },
  { id: 'riceInCheck', group: 'balance', target: 7, rule: { kind: 'riceDays' } },
  { id: 'onTarget', group: 'balance', target: 7, rule: { kind: 'kcalDays' } },
  { id: 'proteinPower', group: 'balance', target: 5, rule: { kind: 'proteinDays' } },
  { id: 'firstWeighIn', group: 'body', target: 1, rule: { kind: 'weighIns' } },
  { id: 'weeklyCheckIn', group: 'body', target: 4, rule: { kind: 'weighWeeks' } },
  { id: 'first5lb', group: 'body', target: 5, rule: { kind: 'lbTowardGoal' } },
  { id: 'halfway', group: 'body', target: 50, rule: { kind: 'goalShare' } },
  { id: 'goalReached', group: 'body', target: 100, rule: { kind: 'goalShare' } },
];

/** One logged (done) meal, reduced to what badges need. */
export type BadgeMeal = { day: string; hour: number; source: string; dishIds: string[]; shared: boolean };

/** Totals for one day that has meals. */
export type BadgeDay = { day: string; kcal: number; proteinG: number; ricePlates: number };

export type BadgeInput = {
  /** Done meals, any order. */
  meals: BadgeMeal[];
  days: BadgeDay[];
  /** Days marked as feast days (they keep a streak alive). */
  feastDays: string[];
  /** Weigh-ins, oldest first; the first is the onboarding weight. */
  weights: { day: string; lb: number }[];
  goal: Goal | null;
  targetLb: number | null;
  targets: { kcal: number; proteinG: number; ricePlates: number };
  /** Today (YYYY-MM-DD): today isn't over, so it doesn't count for day goals yet. */
  today: string;
};

export type BadgeStatus = {
  id: BadgeId;
  group: BadgeGroup;
  target: number;
  /** Progress toward `target` (never above it). */
  current: number;
  /** Day it was first reached, or null while locked. */
  earnedOn: string | null;
  /** False when it can't apply (weight-goal badges while maintaining). */
  available: boolean;
};

/** A calorie day counts when it lands between these shares of the target. */
const KCAL_LOW = 0.85;
const KCAL_HIGH = 1.05;

export type CalorieDay = 'none' | 'under' | 'onTarget' | 'over';

/**
 * How a day's calories compare with the target (also the "On Target" badge
 * and the week strip on Home): on target between 85 % and 105 %.
 */
export function calorieDay(kcal: number, target: number): CalorieDay {
  if (kcal <= 0) return 'none';
  if (kcal > target * KCAL_HIGH) return 'over';
  return kcal >= target * KCAL_LOW ? 'onTarget' : 'under';
}

const DAY_MS = 86_400_000;
const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
};
/** Weeks start on Monday (1970-01-01 was a Thursday). */
const weekNumber = (key: string) => Math.floor((dayNumber(key) + 3) / 7);

/** `days` lists one day per qualifying event, oldest first: the day the count reached `target`. */
function reachedOn(days: string[], target: number) {
  return days.length >= target ? days[target - 1] : null;
}

function evaluate(def: BadgeDef, input: BadgeInput, ctx: Context): Omit<BadgeStatus, 'id' | 'group' | 'target'> {
  const { target, rule } = def;
  const count = (days: string[]) => ({ current: days.length, earnedOn: reachedOn(days, target), available: true });

  switch (rule.kind) {
    case 'streak':
      return { current: ctx.longestStreak, earnedOn: ctx.streakReached(target), available: true };
    case 'meals':
      return count(ctx.mealDays);
    case 'threeMeals':
      return count(ctx.threeMealDays);
    case 'source':
      return count(ctx.mealsBy((m) => m.source === rule.source));
    case 'shared':
      return count(ctx.mealsBy((m) => m.shared));
    case 'dish':
      return count(
        ctx.mealsBy((m) => m.dishIds.includes(rule.dishId) && (rule.beforeHour === undefined || m.hour < rule.beforeHour)),
      );
    case 'riceDays':
      return count(ctx.finishedDays.filter((d) => d.ricePlates <= input.targets.ricePlates).map((d) => d.day));
    case 'kcalDays':
      return count(
        ctx.finishedDays.filter((d) => calorieDay(d.kcal, input.targets.kcal) === 'onTarget').map((d) => d.day),
      );
    case 'proteinDays':
      return count(ctx.finishedDays.filter((d) => d.proteinG >= input.targets.proteinG).map((d) => d.day));
    case 'weighIns':
      // The first point is the onboarding answer, not a weigh-in.
      return count(input.weights.slice(1).map((w) => w.day));
    case 'weighWeeks': {
      const seen = new Set<number>();
      const firstOfWeek = input.weights.filter((w) => {
        const week = weekNumber(w.day);
        if (seen.has(week)) return false;
        seen.add(week);
        return true;
      });
      return count(firstOfWeek.map((w) => w.day));
    }
    case 'lbTowardGoal': {
      if (!ctx.towardGoal) return { current: 0, earnedOn: null, available: false };
      const hit = ctx.towardGoal.find((p) => p.lb >= target);
      return { current: ctx.bestLb, earnedOn: hit?.day ?? null, available: true };
    }
    case 'goalShare': {
      if (!ctx.towardGoal) return { current: 0, earnedOn: null, available: false };
      const hit = ctx.towardGoal.find((p) => p.share * 100 >= target);
      return { current: Math.floor(ctx.bestShare * 100), earnedOn: hit?.day ?? null, available: true };
    }
  }
}

type Context = ReturnType<typeof buildContext>;

function buildContext(input: BadgeInput) {
  const meals = [...input.meals].sort((a, b) => a.day.localeCompare(b.day) || a.hour - b.hour);
  const mealsBy = (pick: (m: BadgeMeal) => boolean) => meals.filter(pick).map((m) => m.day);

  // Streak runs over logged and feast days, oldest first.
  const active = [...new Set([...meals.map((m) => m.day), ...input.feastDays])].sort();
  const firstReach = new Map<number, string>();
  let run = 0;
  let longestStreak = 0;
  active.forEach((day, i) => {
    run = i > 0 && dayNumber(day) - dayNumber(active[i - 1]) === 1 ? run + 1 : 1;
    if (!firstReach.has(run)) firstReach.set(run, day);
    longestStreak = Math.max(longestStreak, run);
  });

  // Breakfast before 11, lunch 11–16, dinner from 16.
  const slots = new Map<string, Set<number>>();
  for (const m of meals) {
    const slot = m.hour < 11 ? 0 : m.hour < 16 ? 1 : 2;
    slots.set(m.day, (slots.get(m.day) ?? new Set()).add(slot));
  }
  const threeMealDays = [...slots].filter(([, s]) => s.size === 3).map(([day]) => day);

  const finishedDays = input.days.filter((d) => d.day < input.today).sort((a, b) => a.day.localeCompare(b.day));

  // Distance covered toward the weight goal at each weigh-in (lose or gain only).
  const start = input.weights[0]?.lb;
  const goal = input.goal;
  const canMove = goal !== null && goal !== 'maintain' && input.targetLb !== null && start !== undefined;
  const towardGoal = canMove
    ? input.weights.map((w) => ({
        day: w.day,
        lb: goal === 'lose' ? start - w.lb : w.lb - start,
        share: goalProgress(goal, start, w.lb, input.targetLb as number) ?? 0,
      }))
    : null;

  return {
    mealsBy,
    mealDays: meals.map((m) => m.day),
    threeMealDays,
    longestStreak,
    streakReached: (n: number) => firstReach.get(n) ?? null,
    finishedDays,
    towardGoal,
    bestLb: Math.max(0, ...(towardGoal ?? []).map((p) => p.lb)),
    bestShare: Math.max(0, ...(towardGoal ?? []).map((p) => p.share)),
  };
}

export function evaluateBadges(input: BadgeInput): BadgeStatus[] {
  const ctx = buildContext(input);
  return BADGES.map((def) => {
    const r = evaluate(def, input, ctx);
    return { id: def.id, group: def.group, target: def.target, ...r, current: Math.min(r.current, def.target) };
  });
}

/** Longest run of logged (or feast) days ever. */
export function longestStreak(input: Pick<BadgeInput, 'meals' | 'feastDays'>) {
  return buildContext({ ...emptyInput, ...input }).longestStreak;
}

const emptyInput: BadgeInput = {
  meals: [],
  days: [],
  feastDays: [],
  weights: [],
  goal: null,
  targetLb: null,
  targets: { kcal: 0, proteinG: 0, ricePlates: 0 },
  today: '',
};
