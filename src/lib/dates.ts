/** YYYY-MM-DD in local time. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromDayKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** The day `n` days after `key` (negative = before), as YYYY-MM-DD. */
export const shiftDay = (key: string, n: number) => {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) =>
  Math.round((fromDayKey(to).getTime() - fromDayKey(from).getTime()) / 86_400_000);

/** Monday of the week `key` falls in (weeks run Monday to Sunday). */
export const weekStart = (key: string) => {
  const d = fromDayKey(key);
  return shiftDay(key, -((d.getDay() + 6) % 7));
};

/** The seven dates (local midnight) of the week `date` falls in, Monday first. */
export const weekDates = (date: Date) => {
  const monday = weekStart(dayKey(date));
  return Array.from({ length: 7 }, (_, i) => fromDayKey(shiftDay(monday, i)));
};

/**
 * The days of one month laid out in weeks starting on Monday: each row has 7
 * cells, `null` before the 1st and after the last day.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => dayKey(new Date(year, month, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
}
