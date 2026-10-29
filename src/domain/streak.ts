/**
 * Days in a row with at least one logged meal, counting back from today.
 * Today not logged yet doesn't break the streak (the day isn't over).
 * Feast days (အလှူ / ပွဲ) count as logged so a celebration never breaks it.
 */
export function streakDays(loggedDays: Set<string>, feastDays: Set<string>, today: Date, dayKey: (d: Date) => string) {
  const d = new Date(today);
  if (!loggedDays.has(dayKey(d)) && !feastDays.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (loggedDays.has(dayKey(d)) || feastDays.has(dayKey(d))) {
    count += 1;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
