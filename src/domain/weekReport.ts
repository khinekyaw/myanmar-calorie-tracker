import { calorieDay } from './badges';

/**
 * The weekly report (Monday to Sunday). Worked out on the phone from meals,
 * weights and the plan, like the badges, so it works offline and needs no
 * server table. Streak and badges come from their own domain functions.
 */

/** Totals for one day that has meals. */
export type ReportDay = { day: string; kcal: number; proteinG: number; fatG: number; ricePlates: number };

export type ReportInput = {
  /** Monday of the week (YYYY-MM-DD). */
  weekStart: string;
  /** Days with meals, any week, any order. */
  days: ReportDay[];
  /** Done meals, any week: the dishes in each. */
  meals: { day: string; dishIds: string[] }[];
  /** Weigh-ins, oldest first. */
  weights: { day: string; lb: number }[];
  targets: { kcal: number; proteinG: number; ricePlates: number };
  /** Today (YYYY-MM-DD): a week that hasn't ended yet is "so far". */
  today: string;
};

/** One tip per week, the first rule that applies. */
export type TipId = 'logMore' | 'lessRice' | 'moreProtein' | 'overKcal' | 'underKcal' | 'keepGoing';

export type WeekReport = {
  weekStart: string;
  /** Sunday. */
  weekEnd: string;
  /** False while the week is still running. */
  complete: boolean;
  daysLogged: number;
  /** Averages over the logged days (0 when none). */
  avgKcal: number;
  avgRicePlates: number;
  avgProteinG: number;
  avgFatG: number;
  /** Finished days within 85–105 % of the calorie target, and days over it. */
  onTargetDays: number;
  overDays: number;
  /** Last weigh-in of the week minus the one before the week (or its first), or null. */
  weightChangeLb: number | null;
  /** Most-logged dishes (by meals), up to 3. */
  topDishes: { dishId: string; count: number }[];
  tip: TipId;
};

const DAY_MS = 86_400_000;
const toNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
};
const toKey = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

export const addDays = (key: string, days: number) => toKey(toNumber(key) + days);

/** Monday of the week a day falls in (1970-01-01 was a Thursday). */
export const weekStartOf = (key: string) => {
  const n = toNumber(key);
  return toKey(n - ((n + 3) % 7));
};

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

export function weekReport(input: ReportInput): WeekReport {
  const { weekStart, targets } = input;
  const weekEnd = addDays(weekStart, 6);
  const inWeek = (day: string) => day >= weekStart && day <= weekEnd;

  const days = input.days.filter((d) => inWeek(d.day) && d.kcal > 0);
  const finished = days.filter((d) => d.day < input.today);
  const kinds = finished.map((d) => calorieDay(d.kcal, targets.kcal));

  const before = input.weights.filter((w) => w.day < weekStart).at(-1);
  const during = input.weights.filter((w) => inWeek(w.day));
  const from = before ?? during[0];
  const to = during.at(-1);
  const weightChangeLb = from && to && from !== to ? Math.round((to.lb - from.lb) * 10) / 10 : null;

  const counts = new Map<string, number>();
  for (const m of input.meals.filter((m) => inWeek(m.day))) {
    for (const id of new Set(m.dishIds)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const topDishes = [...counts]
    .map(([dishId, count]) => ({ dishId, count }))
    .sort((a, b) => b.count - a.count || a.dishId.localeCompare(b.dishId))
    .slice(0, 3);

  const report = {
    weekStart,
    weekEnd,
    complete: weekEnd < input.today,
    daysLogged: days.length,
    avgKcal: Math.round(average(days.map((d) => d.kcal))),
    avgRicePlates: average(days.map((d) => d.ricePlates)),
    avgProteinG: Math.round(average(days.map((d) => d.proteinG))),
    avgFatG: Math.round(average(days.map((d) => d.fatG))),
    onTargetDays: kinds.filter((k) => k === 'onTarget').length,
    overDays: kinds.filter((k) => k === 'over').length,
    weightChangeLb,
    topDishes,
  };
  // Finished days so far (today isn't over, so it isn't expected yet).
  const elapsed = report.complete ? 7 : toNumber(input.today) - toNumber(weekStart);
  return { ...report, tip: pickTip(report, targets, elapsed) };
}

function pickTip(r: Omit<WeekReport, 'tip'>, targets: ReportInput['targets'], elapsed: number): TipId {
  if (r.daysLogged === 0 || r.daysLogged < Math.min(4, elapsed)) return 'logMore';
  if (r.avgRicePlates > targets.ricePlates + 0.25) return 'lessRice';
  if (r.avgProteinG < targets.proteinG * 0.85) return 'moreProtein';
  if (r.overDays >= 3) return 'overKcal';
  if (r.avgKcal < targets.kcal * 0.85) return 'underKcal';
  return 'keepGoing';
}
