import type { Goal } from './plan';

/**
 * Share of the way from the starting weight to the goal, 0–1.
 * Null when maintaining (there's no distance to cover).
 */
export function goalProgress(goal: Goal | null, start: number, current: number, target: number): number | null {
  if (!goal || goal === 'maintain' || start === target) return null;
  const done = goal === 'lose' ? start - current : current - start;
  const total = Math.abs(start - target);
  return Math.min(Math.max(done / total, 0), 1);
}

/** "Nice" axis ticks covering [min, max]: 3–5 round numbers. */
export function axisTicks(min: number, max: number, count = 4): number[] {
  const span = Math.max(max - min, 1);
  const raw = span / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
