import { dishes as bundled, setCatalogue, type Dish } from '@/mocks/dishes';

import { db, getMeta, nowIso, setMeta } from './database';

/**
 * The dish catalogue lives in the database so the server can update it later
 * (new dishes, verified numbers) without an app release. The bundled list
 * seeds it; bump CATALOGUE_VERSION when the bundled list changes.
 */
const CATALOGUE_VERSION = 1;

export function seedCatalogue() {
  if (Number(getMeta('catalogue_version') ?? 0) >= CATALOGUE_VERSION) return;
  db.withTransactionSync(() => {
    for (const dish of Object.values(bundled)) {
      // Photos are bundled assets, so they aren't stored; they're matched by id on load.
      const { photo: _photo, ...data } = dish as Dish;
      db.runSync(
        'INSERT INTO dishes (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
        dish.id,
        JSON.stringify(data),
        nowIso(),
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
