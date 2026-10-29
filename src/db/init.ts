import { Storage } from 'expo-sqlite/kv-store';

import { sampleLogs, sampleWeights } from '@/mocks/samples';
import type { Measurement } from '@/store/weights';

import { getMeta, setMeta } from './database';
import { loadCatalogue, seedCatalogue } from './dishes';
import { countLogs, saveLog } from './foodLogs';
import { countWeights, saveWeight } from './weights';

let ready = false;

/**
 * Run once before the stores load (they call it from their initialisers):
 * dish catalogue, first-launch sample data, and moving weights saved by the
 * previous version (key-value store) into the database.
 */
export function initDatabase() {
  if (ready) return;
  ready = true;
  seedCatalogue();
  loadCatalogue();

  if (!getMeta('samples_v1')) {
    if (countLogs() === 0) sampleLogs().forEach(saveLog);
    if (countWeights() === 0) (legacyWeights() ?? sampleWeights()).forEach(saveWeight);
    setMeta('samples_v1', '1');
  }
}

/** Weights from the old key-value store, if this phone had an earlier build. */
function legacyWeights(): Measurement[] | null {
  const raw = Storage.getItemSync('weights');
  if (!raw) return null;
  Storage.removeItemSync('weights');
  const entries = (JSON.parse(raw) as { state?: { entries?: Measurement[] } }).state?.entries;
  return entries?.length ? entries : null;
}
