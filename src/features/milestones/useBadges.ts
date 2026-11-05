import { carbsToRicePlates, sumMacros } from '@/domain/meal';
import { evaluateBadges, longestStreak, type BadgeDay, type BadgeMeal } from '@/domain/badges';
import { useLog } from '@/store/log';
import { useOnboarding } from '@/store/onboarding';
import { usePlan } from '@/store/plan';
import { useSettings } from '@/store/settings';
import { dayKey, series, useWeights } from '@/store/weights';

/** Every badge with its progress, worked out from the meals, weights and plan on the phone. */
export function useBadges() {
  const entries = useLog((s) => s.entries);
  const weightEntries = useWeights((s) => s.entries);
  const feastDays = useSettings((s) => s.feastDays);
  const goal = useOnboarding((s) => s.goal);
  const targetLb = useOnboarding((s) => s.targetWeightLb);
  const plan = usePlan((s) => s.plan);

  const done = entries.filter((e) => e.status === 'done');
  const meals: BadgeMeal[] = done.map((e) => ({
    day: dayKey(e.eatenAt),
    hour: e.eatenAt.getHours(),
    source: e.source,
    dishIds: e.items.map((i) => i.dishId),
    shared: !!e.isSharedMeal,
  }));

  const byDay = new Map<string, typeof done>();
  for (const e of done) byDay.set(dayKey(e.eatenAt), [...(byDay.get(dayKey(e.eatenAt)) ?? []), e]);
  const days: BadgeDay[] = [...byDay].map(([day, list]) => {
    const total = sumMacros(list.flatMap((e) => e.items));
    return { day, kcal: total.kcal, proteinG: total.proteinG, ricePlates: carbsToRicePlates(total.carbG) };
  });

  const today = dayKey(new Date());
  const badges = evaluateBadges({
    meals,
    days,
    feastDays,
    weights: series(weightEntries, 'weight').map((p) => ({ day: p.day, lb: p.value })),
    goal,
    targetLb,
    targets: { kcal: plan.kcal, proteinG: plan.proteinG, ricePlates: plan.ricePlates },
    today,
  }).filter((b) => b.available);

  return { badges, longest: longestStreak({ meals, feastDays }), earned: badges.filter((b) => b.earnedOn).length };
}
