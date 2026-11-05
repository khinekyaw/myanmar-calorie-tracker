/// <reference types="node" />
/**
 * 30 days in the life of one free user, run against the app's real stores,
 * on-phone database (SQLite migrations included) and scan queue. The server
 * is the stand-in in ../fakeServer.ts: the same quota rules as the SQL, with
 * the AI replaced by the mock answers (SCAN_MODEL=mock), so no AI is called.
 *
 * Ma Thida, 34, office worker in Yangon, Burmese UI, wants to lose 10 lb.
 * Starts Thursday 5 November 2026. Patchy mobile data, one missed day, one
 * feast day. Each day ends with checks that the phone and the server agree.
 *
 * `SIM_REPORT=1 npx jest scripts/simulation` prints the day-by-day journal.
 */
import type { DishId } from '@/data/dishes';
import type { LogEntry } from '@/store/log';

import { cameraPhoto, photoFiles, wipePhone } from '../fakeNative';
import { FakeScanServer, myanmarDay, ServerError } from '../fakeServer';


jest.mock('expo-sqlite', () => jest.requireActual('../fakeNative'));
jest.mock('expo-sqlite/kv-store', () => ({ Storage: jest.requireActual('../fakeNative').Storage }));
jest.mock('expo-file-system', () => jest.requireActual('../fakeNative').fileSystem);
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('@/lib/network', () => ({ useConnectivity: () => ({ online: true, canUpload: true }) }));
jest.mock('@/services/supabase', () => ({ backendEnabled: true, supabase: null }));
jest.mock('@/services/auth', () => ({
  ensureSession: async () => (globalThis as unknown as Sim).__server.userId,
}));
jest.mock('@/services/scan', () => {
  const actual = jest.requireActual('@/services/scan');
  const server = () => (globalThis as unknown as Sim).__server;
  // The server's errors become the app's own ScanError, as the real client does from status codes.
  const asApp = (e: unknown) => (e instanceof Error && 'kind' in e ? new actual.ScanError(e.kind, e.message) : e);
  return {
    ...actual,
    compressPhoto: async (uri: string) => uri,
    uploadPhoto: (logId: string) => server().upload(logId),
    scanPhoto: (logId: string, takenAt: Date) =>
      server()
        .scan(logId, takenAt)
        .catch((e: unknown) => {
          throw asApp(e);
        }),
  };
});
// zustand's hooks read the store directly, so the app's own hooks (streak, badges,
// week report, scans left) can be called outside a component.
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
  useCallback: <T>(fn: T) => fn,
  useDebugValue: () => {},
}));

type Sim = { __server: FakeScanServer };

/** The app's modules, as one launch of the app sees them. */
function launchApp() {
  /* eslint-disable @typescript-eslint/no-require-imports */
  return {
    log: require('@/store/log') as typeof import('@/store/log'),
    quota: require('@/store/scanQuota') as typeof import('@/store/scanQuota'),
    queue: require('@/features/logging/scanQueue') as typeof import('@/features/logging/scanQueue'),
    onboarding: require('@/store/onboarding') as typeof import('@/store/onboarding'),
    plan: require('@/store/plan') as typeof import('@/store/plan'),
    weights: require('@/store/weights') as typeof import('@/store/weights'),
    settings: require('@/store/settings') as typeof import('@/store/settings'),
    premium: require('@/store/premium') as typeof import('@/store/premium'),
    badges: require('@/features/milestones/useBadges') as typeof import('@/features/milestones/useBadges'),
    report: require('@/features/report/useWeekReport') as typeof import('@/features/report/useWeekReport'),
    search: require('@/domain/search') as typeof import('@/domain/search'),
    parse: require('@/domain/parseMeal') as typeof import('@/domain/parseMeal'),
    misses: require('@/db/searchMisses') as typeof import('@/db/searchMisses'),
    database: require('@/db/database') as typeof import('@/db/database'),
    dishes: require('@/data/dishes') as typeof import('@/data/dishes'),
    scan: require('@/services/scan') as typeof import('@/services/scan'),
    planDomain: require('@/domain/plan') as typeof import('@/domain/plan'),
    meal: require('@/domain/meal') as typeof import('@/domain/meal'),
    waitReason: require('@/domain/waitReason') as typeof import('@/domain/waitReason'),
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
}
type App = ReturnType<typeof launchApp>;

const START = { y: 2026, m: 10, d: 5 }; // Thursday 5 November 2026 (month is 0-based)
/** Local (Yangon) time on simulation day `day`. */
const at = (day: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(START.y, START.m, START.d + day, h, m);
};

/** Let queued promises (the scan queue's sends) finish. */
async function settle() {
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
}

class Phone {
  app: App;
  online = true;
  paywallViews = 0;
  journal: string[] = [];
  private warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  constructor(readonly server: FakeScanServer) {
    (globalThis as unknown as Sim).__server = server;
    this.app = launchApp();
  }

  /** Close the app (memory is lost) and open it again; the disk stays. */
  restart() {
    jest.resetModules();
    this.app = launchApp();
  }

  set(time: Date) {
    jest.setSystemTime(time);
  }

  get entries() {
    return this.app.log.useLog.getState().entries;
  }
  entry(id: string) {
    return this.entries.find((e) => e.id === id);
  }

  /** The app comes to the front: the scan queue sends what is due (useScanQueue). */
  async open() {
    if (this.online) this.app.queue.sendDuePhotos();
    await settle();
  }

  scansLeft() {
    return this.app.quota.useScansLeft();
  }

  /** Camera shutter: the paywall when no free scans are left, else the photo is queued (and sent when online). */
  async photo(name: string, answer?: number): Promise<string | null> {
    if (this.scansLeft() <= 0) {
      this.paywallViews += 1;
      return null;
    }
    if (answer !== undefined) this.server.answerNext(answer);
    const id = await this.app.queue.queuePhoto(cameraPhoto(name));
    await this.open();
    return id;
  }

  /** What Result shows for a photo meal (the user's next step depends on it). */
  waitReason(e: LogEntry) {
    const today = myanmarDay(new Date());
    const blocked = this.app.quota.useScanQuota.getState().blockedDay === today && !this.app.premium.isPremiumNow();
    return this.app.waitReason.waitReason({
      status: e.status,
      itemCount: e.items.length,
      blocked,
      canUpload: this.online,
      failed: false,
    });
  }

  /** The user goes through Result: PickDish when unsure, their share of a table, words when no food. */
  review(id: string, opts: { pick?: number; share?: Record<string, number>; words?: string } = {}) {
    const e = this.entry(id);
    if (!e || e.status !== 'done') return;
    const { updateEntry } = this.app.log.useLog.getState();
    if (!e.items.length) {
      updateEntry(id, { items: this.app.parse.parseMeal(opts.words ?? 'mohinga'), confidence: 1, status: 'done' });
    } else if (e.isSharedMeal) {
      const items = e.items.map((i) => ({ ...i, qty: opts.share?.[i.dishId] ?? i.qty })).filter((i) => i.qty > 0);
      updateEntry(id, { items, isSharedMeal: true, confidence: 1, status: 'done' });
    } else if ((e.confidence ?? 1) < this.app.scan.CONFIDENCE_THRESHOLD) {
      const picked = e.candidates?.[opts.pick ?? 0]?.dishId ?? e.items[0].dishId;
      const [first, ...rest] = e.items;
      updateEntry(id, { items: [{ dishId: picked, qty: first.qty, oil: 'normal' }, ...rest], confidence: 1, status: 'done' });
    }
  }

  /** Say or type (TextLog). With `id`, replaces a photo meal's items. */
  words(text: string, id?: string) {
    const items = this.app.parse.parseMeal(text);
    expect(items.length).toBeGreaterThan(0);
    const { addEntry, updateEntry } = this.app.log.useLog.getState();
    if (id) updateEntry(id, { items, confidence: 1, status: 'done' });
    else addEntry({ source: 'voice', status: 'done', items });
    return items;
  }

  /** Search and pick the first result; a search with no result is recorded for the catalogue. */
  search(query: string) {
    const found = this.app.search.searchDishes(query);
    if (!found.length) {
      this.app.misses.recordSearchMiss(query);
      return null;
    }
    this.app.log.useLog.getState().addEntry({ source: 'search', status: 'done', items: [{ dishId: found[0].id as DishId, qty: 1 }] });
    return found[0].id;
  }

  weigh(lb: number) {
    this.app.weights.useWeights.getState().log('weight', lb);
    this.app.plan.refreshPlan();
  }

  deleteMeal(id: string) {
    this.app.log.useLog.getState().removeEntry(id);
  }

  note(line: string) {
    this.journal.push(line);
  }

  dispose() {
    this.warn.mockRestore();
  }
}

const sumOf = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  // Release builds start with no sample meals.
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
afterAll(() => {
  jest.useRealTimers();
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
});

describe('30 days as a free user (mock AI)', () => {
  let phone: Phone;
  let server: FakeScanServer;

  beforeAll(() => {
    jest.setSystemTime(at(0, '07:00'));
    wipePhone();
    jest.resetModules();
    server = new FakeScanServer(at(0, '07:00'));
    phone = new Phone(server);
  });
  afterAll(() => {
    phone.dispose();
    if (process.env.SIM_REPORT) console.log(phone.journal.join('\n'));
  });

  it('lives through 30 days with the phone and the server agreeing every day', async () => {
    const app = () => phone.app;
    const my = (id: DishId) => app().dishes.getDish(id).name.my;
    const totalAllowance = (days: number) => Math.min(days, 7) * 3 + Math.max(days - 7, 0);
    let aiFailures = 0;

    // ── Day 0 (Thu 5 Nov): onboarding, then three photo meals ─────────────
    phone.set(at(0, '07:00'));
    expect(phone.entries).toHaveLength(0); // no sample meals in a release build
    app().onboarding.useOnboarding.getState().update({
      sex: 'female',
      birthYear: '1992',
      heightFt: '5',
      heightIn: '3',
      weightLb: '150',
      workday: 'office',
      goal: 'lose',
      targetWeightLb: 140,
      pace: 1,
      eatingPlaces: ['homeShared', 'teaShop'],
    });
    app().onboarding.useOnboarding.getState().complete();
    const input = app().onboarding.draftToPlanInput(app().onboarding.useOnboarding.getState())!;
    app().plan.usePlan.getState().setPlan(app().planDomain.buildPlan(input));
    app().weights.useWeights.getState().log('weight', input.weightLb);
    const plan0 = app().plan.usePlan.getState().plan;
    expect(plan0.kcal).toBeGreaterThanOrEqual(1200);
    expect(plan0.targetDate).not.toBeNull();
    phone.note(`Plan: ${plan0.kcal} kcal, ${plan0.ricePlates} plates of rice, ${plan0.proteinG} g protein`);

    expect(phone.scansLeft()).toBe(3);
    phone.set(at(0, '07:30'));
    const breakfast = (await phone.photo('d0-mohinga', 0))!;
    expect(phone.entry(breakfast)).toMatchObject({ status: 'done' });
    expect(phone.entry(breakfast)!.items.map((i) => i.dishId)).toEqual(['mohinga', 'boiledEgg']);

    phone.set(at(0, '12:40'));
    const lunch = (await phone.photo('d0-curry', 2))!;
    expect(phone.entry(lunch)!.confidence).toBeLessThan(app().scan.CONFIDENCE_THRESHOLD); // → PickDish
    phone.review(lunch, { pick: 1 }); // "it was pork"
    expect(phone.entry(lunch)!.items[0].dishId).toBe('porkCurry');

    phone.set(at(0, '19:10'));
    const dinner = (await phone.photo('d0-table', 1))!;
    expect(phone.entry(dinner)!.isSharedMeal).toBe(true);
    phone.review(dinner, { share: { rice: 1, chickenCurry: 2, gourdFritter: 1, clearSoup: 1, ngapiYay: 0 } });
    expect(phone.entry(dinner)!.items.find((i) => i.dishId === 'ngapiYay')).toBeUndefined();

    phone.set(at(0, '21:00'));
    expect(phone.scansLeft()).toBe(0);
    expect(await phone.photo('d0-snack')).toBeNull(); // shutter opens the paywall
    expect(phone.paywallViews).toBe(1);
    phone.words('2 samosa');
    expect(server.scansLeft()).toBe(0);

    // ── Each day after: the routine plus that day's edge case ─────────────
    const routine = async (
      day: number,
      opts: { breakfastPhoto?: boolean; dinnerPhoto?: boolean; skipBreakfast?: boolean } = {},
    ) => {
      if (!opts.skipBreakfast) phone.set(at(day, '07:20'));
      await phone.open();
      if (opts.skipBreakfast) {
        // Breakfast already logged.
      } else if (opts.breakfastPhoto) {
        const id = await phone.photo(`d${day}-breakfast`, day % 2 ? 4 : 0);
        if (id) phone.review(id);
        else app().log.useLog.getState().quickAdd('tea');
      } else {
        app().log.useLog.getState().quickAdd('tea');
        phone.search('palata');
      }
      phone.set(at(day, '12:30'));
      phone.words(day % 2 ? `${my('rice')} ${my('chickenCurry')}` : 'rice and fish curry');
      phone.set(at(day, '19:00'));
      const id = opts.dinnerPhoto ? await phone.photo(`d${day}-dinner`, day % 3 ? 1 : 3) : null;
      if (id) phone.review(id, { share: { rice: 1, chickenCurry: 2 } });
      else phone.words('rice and pork curry');
    };

    /** End of day: nothing waits, and the phone shows exactly the scans the server would give. */
    const endOfDay = (day: number) => {
      phone.set(at(day, '23:59'));
      const queued = phone.entries.filter((e) => e.status !== 'done');
      const summary = (() => {
        const done = phone.entries.filter((e) => e.status === 'done' && myanmarDay(e.eatenAt) === myanmarDay(at(day, '12:00')));
        const kcal = Math.round(app().meal.sumMacros(done.flatMap((e: LogEntry) => e.items)).kcal);
        return { meals: done.length, kcal };
      })();
      const streak = app().log.useStreak();
      const { earned } = app().badges.useBadges();
      phone.note(
        `Day ${String(day).padStart(2)} ${at(day, '12:00').toDateString().slice(0, 10)}: ` +
          `${summary.meals} meals, ${summary.kcal} kcal / ${app().plan.usePlan.getState().plan.kcal} · ` +
          `scans left ${phone.scansLeft()} (server ${server.scansLeft()}) · streak ${streak} · badges ${earned} · ` +
          `AI calls ${server.aiCalls}${queued.length ? ` · waiting ${queued.length}` : ''}`,
      );
      // Never more free scans on a day than the allowance.
      expect(server.quota.get(myanmarDay(at(day, '12:00'))) ?? 0).toBeLessThanOrEqual(server.allowance());
      if (!queued.length) expect(phone.scansLeft()).toBe(server.scansLeft());
      else expect(phone.scansLeft()).toBeLessThanOrEqual(server.scansLeft()!);
      // The AI was only called for free scans, plus attempts that failed (and were given back).
      expect(server.aiCalls).toBeLessThanOrEqual(totalAllowance(day + 1) + aiFailures);
    };
    endOfDay(0);

    // Day 1: data runs out in the evening; two photos wait offline overnight.
    await routine(1, { breakfastPhoto: true });
    phone.online = false;
    phone.set(at(1, '19:00'));
    const offline1 = (await phone.photo('d1-dinner-offline'))!;
    phone.set(at(1, '21:30'));
    const offline2 = (await phone.photo('d1-snack-offline', 4))!;
    expect(phone.waitReason(phone.entry(offline1)!)).toBe('offline');
    expect(phone.scansLeft()).toBe(0);
    endOfDay(1);

    // Day 2: back online at 7:00. Yesterday's photos use yesterday's scans (the day they were taken).
    phone.online = true;
    phone.set(at(2, '07:00'));
    server.answerNext(1);
    await phone.open();
    expect(phone.entry(offline1)!.status).toBe('done');
    expect(phone.entry(offline2)!.status).toBe('done');
    phone.review(offline1, { share: { rice: 1 } });
    expect(server.quota.get(myanmarDay(at(1, '12:00')))).toBe(3);
    expect(server.quota.get(myanmarDay(at(2, '12:00'))) ?? 0).toBe(0);
    expect(phone.scansLeft()).toBe(3);
    // The breakfast scan fails once (AI error): the scan is given back and sent again 30 s later.
    server.failNext('ai_error');
    aiFailures += 1;
    phone.set(at(2, '07:30'));
    const failed = (await phone.photo('d2-breakfast', 0))!;
    expect(phone.entry(failed)!.status).toBe('queued');
    expect(server.scansLeft()).toBe(3);
    phone.set(new Date(at(2, '07:30').getTime() + 31_000));
    await phone.open();
    expect(phone.entry(failed)!.status).toBe('done');
    expect(server.scansLeft()).toBe(2);
    await routine(2, { dinnerPhoto: true, skipBreakfast: true });
    endOfDay(2);

    // Day 3: a photo with no food in it. The AI ran, so the scan stays used; she logs it by words.
    await routine(3);
    phone.set(at(3, '16:00'));
    const blurry = (await phone.photo('d3-blurry', 5))!;
    expect(phone.waitReason(phone.entry(blurry)!)).toBe('empty');
    phone.review(blurry, { words: 'tea and 2 palata' });
    expect(phone.entry(blurry)!.items.length).toBeGreaterThan(0);
    endOfDay(3);

    // Day 4 (Mon 9 Nov): first weigh-in; last week's report (she started on Thursday).
    phone.set(at(4, '06:50'));
    phone.weigh(149.2);
    const week1 = app().report.useWeekReport(app().report.useWeekRange().previous);
    expect(week1.report.complete).toBe(true);
    expect(week1.report.daysLogged).toBe(4); // Thu–Sun
    expect(week1.report.weightChangeLb).toBeNull(); // no weigh-in during that week but the first point
    phone.note(`Report week of ${week1.report.weekStart}: ${week1.report.daysLogged} days, avg ${week1.report.avgKcal} kcal, tip ${week1.report.tip}`);
    await routine(4, { breakfastPhoto: true, dinnerPhoto: true });
    endOfDay(4);

    // Day 5: offline photo deleted before it was sent, another logged by words instead: both scans come back.
    phone.online = false;
    phone.set(at(5, '07:10'));
    const oops = (await phone.photo('d5-oops'))!;
    const typedInstead = (await phone.photo('d5-typed'))!;
    expect(phone.scansLeft()).toBe(1);
    phone.deleteMeal(oops);
    phone.words('mohinga', typedInstead);
    expect(phone.scansLeft()).toBe(3);
    expect(photoFiles().some((f) => f.includes(oops))).toBe(false); // the photo file is gone too
    phone.online = true;
    await routine(5, { dinnerPhoto: true });
    endOfDay(5);

    // Day 6 → 7: the last first-week scan at 23:50, then the allowance drops at midnight (both sides).
    await routine(6, { breakfastPhoto: true });
    phone.set(at(6, '23:50'));
    const lateNight = (await phone.photo('d6-late', 4))!;
    expect(phone.entry(lateNight)!.status).toBe('done');
    endOfDay(6);
    phone.set(at(7, '00:05'));
    expect(app().quota.freeScansFor(app().quota.useScanQuota.getState().firstDay, myanmarDay(new Date()))).toBe(1);
    expect(server.allowance()).toBe(1);
    expect(phone.scansLeft()).toBe(1);

    // Day 7: one scan a day now; the second photo opens the paywall.
    const before = phone.paywallViews;
    await routine(7, { breakfastPhoto: true, dinnerPhoto: true });
    expect(phone.paywallViews).toBe(before + 1);
    endOfDay(7);

    // Day 8: her sister used today's scan on another phone signed in to the same account.
    // The phone still shows 1 left; the server refuses; the photo waits for tomorrow.
    phone.set(at(8, '07:00'));
    server.useElsewhere(1);
    expect(phone.scansLeft()).toBe(1);
    const refused = (await phone.photo('d8-breakfast', 0))!;
    expect(phone.entry(refused)!.status).toBe('queued');
    expect(phone.waitReason(phone.entry(refused)!)).toBe('quota');
    expect(phone.scansLeft()).toBe(0);
    // The queue doesn't keep asking today; it looks again at midnight.
    const refusedBefore = server.refused.quota;
    expect(app().queue.sendDuePhotos()).toBe(at(9, '00:00').getTime());
    await settle();
    expect(server.refused.quota).toBe(refusedBefore);
    await routine(8);
    endOfDay(8);

    // Day 9: after midnight the waiting photo goes out and uses today's scan.
    phone.set(at(9, '00:00'));
    await phone.open();
    expect(phone.entry(refused)!.status).toBe('done');
    expect(server.quota.get(myanmarDay(new Date()))).toBe(1);
    expect(phone.scansLeft()).toBe(0);
    await routine(9);
    endOfDay(9);

    // Day 10: a feast (အလှူ). She logs nothing and marks the day; the streak holds.
    phone.set(at(10, '20:00'));
    const streakBefore = app().log.useStreak();
    app().settings.useSettings.getState().toggleFeastToday();
    expect(app().log.useStreak()).toBe(streakBefore + 1);
    endOfDay(10);

    // Day 11 (Mon 16 Nov): she forgets the switch. It must not count today too…
    phone.set(at(11, '06:30'));
    expect(app().settings.useSettings.getState().feastDays).toEqual([myanmarDay(at(10, '12:00'))]);
    phone.weigh(147.8);
    await routine(11, { breakfastPhoto: true });
    // …and yesterday's feast still counts after the app restarts.
    phone.restart();
    expect(app().log.useStreak()).toBe(12);
    const week2 = app().report.useWeekReport(app().report.useWeekRange().previous);
    expect(week2.report.daysLogged).toBe(6); // the feast day has no meals
    expect(week2.streak).toBe(11);
    phone.note(`Report week of ${week2.report.weekStart}: ${week2.report.daysLogged} days, avg ${week2.report.avgKcal} kcal, tip ${week2.report.tip}`);
    endOfDay(11);

    // Day 12–13: the app is closed while a scan is running; on reopening, the answer comes from the server's cache.
    await routine(12, { breakfastPhoto: true });
    endOfDay(12);
    await routine(13);
    phone.set(at(13, '16:00'));
    const id13 = await app().queue.queuePhoto(cameraPhoto('d13-killed'));
    app().log.useLog.getState().updateEntry(id13, { status: 'analyzing' });
    await server.upload(id13);
    await server.scan(id13, at(13, '16:00')); // the server finished; the phone never heard back
    const callsBefore = server.aiCalls;
    phone.restart();
    expect(phone.entry(id13)!.status).toBe('queued');
    await phone.open();
    expect(phone.entry(id13)!.status).toBe('done');
    expect(server.aiCalls).toBe(callsBefore); // no second AI call
    expect(server.refused.cached).toBeGreaterThan(0);
    phone.review(id13);
    endOfDay(13);

    // Day 14: a photo the AI can never read. Automatic retries stop after 3; Retry by hand, and the server stops at 6.
    await routine(14);
    phone.set(at(14, '20:00'));
    server.failNext(...Array<'ai_error'>(10).fill('ai_error'));
    const stuck = (await phone.photo('d14-unreadable'))!;
    for (let minute = 1; minute <= 120; minute++) {
      phone.set(new Date(at(14, '20:00').getTime() + minute * 60_000));
      await phone.open();
    }
    expect(server.scans.get(stuck)!.attempts).toBe(app().queue.MAX_AUTO_TRIES);
    for (let tap = 0; tap < 5; tap++) {
      app().queue.retryScan(phone.entry(stuck)!);
      await settle();
    }
    expect(server.scans.get(stuck)!.attempts).toBe(6);
    expect(server.refused.gaveUp).toBe(2);
    aiFailures += 6;
    server.resetFailures();
    expect(server.scansLeft()).toBe(1); // every failure was given back
    phone.words('mohinga and 1 boiled egg', stuck);
    expect(phone.scansLeft()).toBe(1);
    endOfDay(14);

    // Day 15–17: ordinary days; on day 17 a search for sushi finds nothing.
    for (const day of [15, 16, 17]) {
      await routine(day, { breakfastPhoto: day !== 16, dinnerPhoto: day === 16 });
      if (day === 17) {
        expect(phone.search('sushi roll')).toBeNull();
        const pending = app().database.db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM outbox WHERE entity = 'search_miss'");
        expect(pending!.n).toBe(1);
      }
      endOfDay(day);
    }

    // Day 18 (Mon 23 Nov): a busy day, nothing logged. The streak breaks; badges already earned stay.
    phone.set(at(18, '21:00'));
    phone.weigh(146.6);
    const earnedBefore = app().badges.useBadges().earned;
    endOfDay(18);
    phone.set(at(19, '07:00'));
    expect(app().log.useStreak()).toBe(0);
    expect(app().badges.useBadges().earned).toBeGreaterThanOrEqual(earnedBefore);
    expect(app().badges.useBadges().longest).toBe(18);

    // Day 19–29: back to normal, across the month change (30 Nov → 1 Dec).
    const weighIns: Record<number, number> = { 25: 145.0, 29: 144.6 };
    for (let day = 19; day <= 29; day++) {
      if (weighIns[day]) {
        phone.set(at(day, '06:45'));
        phone.weigh(weighIns[day]);
      }
      await routine(day, { breakfastPhoto: day % 2 === 0, dinnerPhoto: day % 2 === 1 });
      if (day === 25) {
        const week4 = app().report.useWeekReport(app().report.useWeekRange().previous);
        expect(week4.report.daysLogged).toBe(6); // Monday the 23rd was missed
        phone.note(`Report week of ${week4.report.weekStart}: ${week4.report.daysLogged} days, avg ${week4.report.avgKcal} kcal, weight ${week4.report.weightChangeLb} lb, tip ${week4.report.tip}`);
      }
      endOfDay(day);
    }

    // ── After 30 days ──────────────────────────────────────────────────────
    phone.set(at(29, '23:59'));
    const final = phone.app;
    expect(phone.entries.filter((e) => e.status !== 'done')).toHaveLength(0);
    expect(final.log.useStreak()).toBe(11);
    const { badges, longest } = final.badges.useBadges();
    const has = (id: string) => Boolean(badges.find((b) => b.id === id)?.earnedOn);
    expect(longest).toBe(18);
    expect(has('streak7')).toBe(true);
    expect(has('streak30')).toBe(false);
    expect(has('meals50')).toBe(true);
    expect(has('firstScan')).toBe(true);
    expect(has('firstVoice')).toBe(true);
    expect(has('first5lb')).toBe(true);
    expect(has('weeklyCheckIn')).toBe(true);
    // The plan follows her weight down.
    expect(final.plan.usePlan.getState().plan.kcal).toBeLessThanOrEqual(plan0.kcal);

    // AI use for one free user over a month.
    const photos = phone.entries.filter((e) => e.source === 'photo').length;
    expect(server.aiCalls).toBeLessThanOrEqual(totalAllowance(30) + aiFailures);
    expect(sumOf(server.quota)).toBeLessThanOrEqual(totalAllowance(30));
    phone.note(
      `\n30 days: ${phone.entries.length} meals (${photos} from photos), ${server.aiCalls} AI calls ` +
        `(${aiFailures} failed and given back), ${sumOf(server.quota)} free scans used of ${totalAllowance(30)}, ` +
        `${phone.paywallViews} paywall views, ${server.refused.quota} quota refusals, ${server.refused.cached} cached answers. ` +
        `Cost at real prices: $${server.costWith('gemini-3.1-flash-lite').toFixed(4)} (Gemini 3.1 Flash-Lite), ` +
        `$${server.costWith('claude-haiku-5-5').toFixed(4)} (Claude Haiku 5.5).`,
    );
    // Everything she made is queued for sync, and deleted meals leave a tombstone.
    const tombstones = final.database.db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM food_logs WHERE deleted_at IS NOT NULL');
    expect(tombstones!.n).toBe(1);
    expect(final.database.pendingSyncCount()).toBeGreaterThan(phone.entries.length);
  });
});

describe('edge cases on a fresh phone', () => {
  let phone: Phone;
  let server: FakeScanServer;

  beforeEach(() => {
    jest.setSystemTime(at(0, '08:00'));
    wipePhone();
    jest.resetModules();
    server = new FakeScanServer(at(0, '08:00'));
    phone = new Phone(server);
  });
  afterEach(() => phone.dispose());

  it('does not hammer the server when only the phone thinks it is Premium', async () => {
    // The paywall's mock pass is phone-only; the server still counts free scans.
    phone.app.premium.usePremium.getState().activate(1);
    for (let i = 0; i < 3; i++) await phone.photo(`p${i}`);
    expect(server.scansLeft()).toBe(0);
    const extra = (await phone.photo('p3'))!;
    expect(phone.entry(extra)!.status).toBe('queued');
    const asked = server.refused.quota;
    // Ten more app wake-ups within a minute: the photo waits for its retry time.
    for (let s = 1; s <= 10; s++) {
      phone.set(new Date(at(0, '08:00').getTime() + s * 5_000));
      await phone.open();
    }
    // Before the fix every wake-up asked again; now at most once in the first minute (retry after 30 s).
    expect(server.refused.quota).toBeLessThanOrEqual(asked + 1);
    expect(server.aiCalls).toBe(3);
  });

  it('keeps meals, the queue and the scan count through an app restart', async () => {
    phone.online = false;
    const id = (await phone.photo('restart'))!;
    phone.words('tea');
    phone.restart();
    expect(phone.entries).toHaveLength(2);
    expect(phone.entry(id)!.status).toBe('queued');
    expect(phone.scansLeft()).toBe(2);
    phone.online = true;
    await phone.open();
    expect(phone.entry(id)!.status).toBe('done');
    expect(server.scansLeft()).toBe(2);
  });

  it('turns the old on/off feast switch into today only', () => {
    // Settings saved by the previous version (one switch, no date).
    jest.resetModules();
    jest.requireActual<typeof import('../fakeNative')>('../fakeNative').Storage.setItemSync(
      'settings',
      JSON.stringify({ state: { language: 'my', feastDay: true, reminders: true }, version: 1 }),
    );
    phone.restart();
    const s = phone.app.settings.useSettings.getState();
    expect(s.feastDays).toEqual([myanmarDay(new Date())]);
    expect(s.language).toBe('my');
    expect('feastDay' in s).toBe(false);
  });

  it('counts a scan used and given back correctly when a queued photo is deleted after a server refusal', async () => {
    server.useElsewhere(3);
    const id = (await phone.photo('refused'))!;
    expect(phone.entry(id)!.status).toBe('queued');
    expect(phone.scansLeft()).toBe(0);
    phone.deleteMeal(id);
    // The server's count is the real one today: still none left.
    expect(phone.scansLeft()).toBe(0);
  });

  it('leaves ServerError and the app ScanError in step', () => {
    const kinds: ServerError['kind'][] = ['quota', 'photo', 'busy', 'retry'];
    for (const kind of kinds) expect(new phone.app.scan.ScanError(kind, '').kind).toBe(kind);
  });
});
