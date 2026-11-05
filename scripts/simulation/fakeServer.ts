import { listDishes } from '@/data/dishes';
import type { ScanResponse, ScanResult } from '@/services/scan';

import { parseScanOutput, type CatalogueDish } from '../../supabase/functions/_shared/scanContract';
import { costUsd, MOCK_ANSWERS, type VisionUsage } from '../../supabase/functions/_shared/vision';

/**
 * The scan server, for the simulation: the same rules as begin_scan /
 * finish_scan / free_scans_per_day (supabase/migrations), with the AI
 * replaced by the mock answers (SCAN_MODEL=mock) run through the real answer
 * check (parseScanOutput). Counts every call that would have reached the AI.
 *
 * Kept in step with the SQL by hand; the pgTAP tests check the SQL itself.
 */

const MYANMAR_OFFSET_MS = 6.5 * 3_600_000;
/** Myanmar calendar day of an instant (YYYY-MM-DD). */
export const myanmarDay = (d: Date) => new Date(d.getTime() + MYANMAR_OFFSET_MS).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** A typical scan's tokens (512 px photo + cached catalogue prompt; reports/Unit economics.md). */
export const TYPICAL_USAGE: VisionUsage = { input: 420, output: 160, cacheRead: 5200, cacheWrite: 0 };

const MAX_ATTEMPTS_PER_PHOTO = 6;

/** Like the app's ScanError (the test turns it into one): what the app makes of the status code. */
export class ServerError extends Error {
  constructor(
    readonly kind: 'quota' | 'photo' | 'busy' | 'retry',
    message: string,
  ) {
    super(message);
  }
}

export type AiOutcome = 'ok' | 'ai_error' | 'photo_missing';
type ScanRow = { status: 'pending' | 'done' | 'failed'; chargedDay: string | null; response: ScanResponse | null; attempts: number };

export class FakeScanServer {
  readonly userId = '5a1a1a1a-0000-4000-8000-00000000c0de';
  readonly createdAt: Date;
  readonly firstWeek = 3;
  readonly after = 1;
  /** Calls that reached the AI (a real model would have been paid for each). */
  aiCalls = 0;
  /** Requests refused before the AI: quota, cached answers, in progress. */
  refused = { quota: 0, cached: 0, busy: 0, gaveUp: 0 };
  readonly photos = new Set<string>();
  readonly quota = new Map<string, number>();
  readonly scans = new Map<string, ScanRow>();
  /** Has the server a pass for this user (only the server grants Premium). */
  serverPass = false;
  /** What the next AI calls do (default ok). */
  private script: AiOutcome[] = [];
  /** Which mock answer each next call gives (index into MOCK_ANSWERS); default rotates. */
  private answers: number[] = [];
  private rotation = 0;
  private readonly catalogue: Map<string, CatalogueDish>;

  constructor(createdAt: Date) {
    this.createdAt = createdAt;
    this.catalogue = new Map(
      listDishes().map((d) => [
        d.id,
        { id: d.id, name_my: d.name.my, name_en: d.name.en, unit: d.unit, ...(d.generic && { generic: true }) },
      ]),
    );
  }

  /** The next AI calls fail (or the photo goes missing) in this order. */
  failNext(...outcomes: AiOutcome[]) {
    this.script.push(...outcomes);
  }

  /** Forget scripted failures that weren't used. */
  resetFailures() {
    this.script = [];
  }

  /** The next AI calls give these MOCK_ANSWERS (0 dish+egg, 1 table, 2 unsure, 3 not on list, 4 tea shop, 5 no food). */
  answerNext(...indexes: number[]) {
    this.answers.push(...indexes);
  }

  /** free_scans_per_day: Myanmar calendar days since sign-up. */
  allowance(now = new Date()) {
    return dayDiff(myanmarDay(this.createdAt), myanmarDay(now)) < 7 ? this.firstWeek : this.after;
  }

  scansLeft(now = new Date()) {
    if (this.serverPass) return null;
    return Math.max(this.allowance(now) - (this.quota.get(myanmarDay(now)) ?? 0), 0);
  }

  /** Another phone on the same account used scans today. */
  useElsewhere(n: number, now = new Date()) {
    const day = myanmarDay(now);
    this.quota.set(day, Math.min((this.quota.get(day) ?? 0) + n, this.allowance(now)));
  }

  upload = async (logId: string): Promise<string> => {
    const path = `${this.userId}/${logId}.jpg`;
    this.photos.add(path);
    return path;
  };

  /** The `scan` Edge Function: begin_scan → AI → finish_scan. */
  scan = async (logId: string, takenAt: Date): Promise<ScanResult> => {
    const now = new Date();
    const free = this.allowance(now);
    let row = this.scans.get(logId);
    const fresh = !row;
    if (!row) {
      row = { status: 'pending', chargedDay: null, response: null, attempts: 0 };
      this.scans.set(logId, row);
    }
    if (row.status === 'done') {
      this.refused.cached += 1;
      return { response: row.response!, scansLeft: this.scansLeft(now) };
    }
    // The scan function: a photo that failed this often is refused before the AI.
    if (row.status === 'failed' && row.attempts >= MAX_ATTEMPTS_PER_PHOTO) {
      this.refused.gaveUp += 1;
      throw new ServerError('retry', 'scan: 422');
    }
    if (!fresh && row.status === 'pending' && row.attempts > 0) {
      this.refused.busy += 1;
      throw new ServerError('busy', 'already scanning');
    }

    if (row.chargedDay === null && !this.serverPass) {
      const today = myanmarDay(now);
      const age = now.getTime() - takenAt.getTime();
      const taken = age >= 0 && age <= 2 * 86_400_000 ? myanmarDay(takenAt) : today;
      for (const day of taken === today ? [today] : [taken, today]) {
        const used = this.quota.get(day) ?? 0;
        if (used < free) {
          this.quota.set(day, used + 1);
          row.chargedDay = day;
          break;
        }
      }
      if (row.chargedDay === null) {
        row.status = 'failed';
        this.refused.quota += 1;
        throw new ServerError('quota', 'no free scans left');
      }
    }
    row.status = 'pending';
    row.attempts += 1;

    // finish_scan(false): the free scan is given back.
    const fail = (kind: 'photo' | 'retry', message: string) => {
      row.status = 'failed';
      if (row.chargedDay) this.quota.set(row.chargedDay, (this.quota.get(row.chargedDay) ?? 1) - 1);
      row.chargedDay = null;
      return new ServerError(kind, message);
    };

    if (!this.photos.has(`${this.userId}/${logId}.jpg`)) throw fail('photo', 'photo not on the server');
    const outcome = this.script.shift() ?? 'ok';
    if (outcome === 'photo_missing') {
      this.photos.delete(`${this.userId}/${logId}.jpg`);
      throw fail('photo', 'photo not on the server');
    }
    this.aiCalls += 1;
    if (outcome === 'ai_error') throw fail('retry', 'scan: 502');

    const index = this.answers.shift() ?? this.rotation++ % MOCK_ANSWERS.length;
    const response = parseScanOutput(JSON.parse(JSON.stringify(MOCK_ANSWERS[index])), this.catalogue) as ScanResponse;
    row.status = 'done';
    row.response = response;
    return { response, scansLeft: this.scansLeft(now) };
  };

  /** What the AI calls so far would have cost with `model` (USD). */
  costWith(model: string) {
    return (costUsd([model], TYPICAL_USAGE) ?? 0) * this.aiCalls;
  }
}
