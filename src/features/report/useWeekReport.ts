import { carbsToRicePlates, sumMacros } from '@/domain/meal';
import { streakDays } from '@/domain/streak';
import { weekReport, type ReportDay } from '@/domain/weekReport';
import { shiftDay, weekStart } from '@/lib/dates';
import { useLog } from '@/store/log';
import { usePlan } from '@/store/plan';
import { useSettings } from '@/store/settings';
import { dayKey, fromDayKey, series, useWeights } from '@/store/weights';

import { useBadges } from '../milestones/useBadges';

/** Monday of this week, and of the first week with a meal or weigh-in. */
export function useWeekRange() {
  const entries = useLog((s) => s.entries);
  const weights = useWeights((s) => s.entries);
  const today = dayKey(new Date());
  const firstDay = [...entries.map((e) => dayKey(e.eatenAt)), ...weights.map((w) => w.day), today].sort()[0];
  const last = weekStart(today);
  return { first: weekStart(firstDay), last, previous: shiftDay(last, -7) };
}

/** The report for the week starting `weekStart`, from the meals, weights and plan on the phone. */
export function useWeekReport(weekStart: string) {
  const entries = useLog((s) => s.entries);
  const weightEntries = useWeights((s) => s.entries);
  const feastDays = useSettings((s) => s.feastDays);
  const plan = usePlan((s) => s.plan);
  const { badges } = useBadges();

  const today = dayKey(new Date());
  const weekEnd = shiftDay(weekStart, 6);
  const done = entries.filter((e) => e.status === 'done');
  const inWeek = done.filter((e) => {
    const day = dayKey(e.eatenAt);
    return day >= weekStart && day <= weekEnd;
  });

  const byDay = new Map<string, typeof inWeek>();
  for (const e of inWeek) byDay.set(dayKey(e.eatenAt), [...(byDay.get(dayKey(e.eatenAt)) ?? []), e]);
  const days: ReportDay[] = [...byDay].map(([day, list]) => {
    const total = sumMacros(list.flatMap((e) => e.items));
    return { day, kcal: total.kcal, proteinG: total.proteinG, fatG: total.fatG, ricePlates: carbsToRicePlates(total.carbG) };
  });

  const report = weekReport({
    weekStart,
    days,
    meals: inWeek.map((e) => ({ day: dayKey(e.eatenAt), dishIds: e.items.map((i) => i.dishId) })),
    weights: series(weightEntries, 'weight').map((p) => ({ day: p.day, lb: p.value })),
    targets: { kcal: plan.kcal, proteinG: plan.proteinG, ricePlates: plan.ricePlates },
    today,
  });

  // Streak as the week ended (or today, for this week).
  const logged = new Set(done.map((e) => dayKey(e.eatenAt)));
  const feast = new Set(feastDays);
  const streak = streakDays(logged, feast, fromDayKey(weekEnd < today ? weekEnd : today), dayKey);

  const earned = badges.filter((b) => b.earnedOn && b.earnedOn >= weekStart && b.earnedOn <= weekEnd);

  return { report, streak, earned, targets: plan };
}
