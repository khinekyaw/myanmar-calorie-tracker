import { dishes as bundled, setCatalogue, type Dish } from '@/data/dishes';

import { db, getMeta, setMeta } from './database';

/**
 * The dish catalogue lives in the database so the server can update it
 * (new dishes, verified numbers) without an app release. The bundled list
 * seeds it; bump CATALOGUE_VERSION and CATALOGUE_DATE when it changes.
 * Rows from the server are newer than CATALOGUE_DATE, so a re-seed never
 * overwrites them. Rows dated in the future (an earlier CATALOGUE_DATE set
 * ahead of the clock) can't be from the server and are replaced.
 */
const CATALOGUE_VERSION = 8;
const CATALOGUE_DATE = '2026-11-02T18:30:00.000Z';

export function seedCatalogue() {
  if (Number(getMeta('catalogue_version') ?? 0) >= CATALOGUE_VERSION) return;
  const now = new Date().toISOString();
  db.withTransactionSync(() => {
    for (const dish of Object.values(bundled)) {
      // Photos are bundled assets, so they aren't stored; they're matched by id on load.
      const { photo: _photo, ...data } = dish as Dish;
      db.runSync(
        `INSERT INTO dishes (id, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
         WHERE dishes.updated_at < excluded.updated_at OR dishes.updated_at > ?`,
        dish.id,
        JSON.stringify(data),
        CATALOGUE_DATE,
        now,
      );
    }
    setMeta('catalogue_version', String(CATALOGUE_VERSION));
  });
}

export function loadCatalogue() {
  const rows = db.getAllSync<{ id: string; data: string }>('SELECT id, data FROM dishes');
  if (!rows.length) return;
  setCatalogue(
    rows.map((r) => {
      const dish = JSON.parse(r.data) as Dish;
      return { ...dish, photo: (bundled as Record<string, Dish>)[r.id]?.photo };
    }),
  );
}

/** Dishes from the server: it owns the catalogue, so its copy always wins. */
export function saveRemoteDishes(list: { dish: Dish; updatedAt: string }[]) {
  db.withTransactionSync(() => {
    for (const { dish, updatedAt } of list) {
      db.runSync(
        'INSERT INTO dishes (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
        dish.id,
        JSON.stringify(dish),
        updatedAt,
      );
    }
  });
}
