/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

/**
 * Stand-ins for the native modules the stores need, so the simulation runs the
 * app's real stores, database code and scan queue under Node:
 *  - expo-sqlite → node:sqlite in memory (same SQL, same migrations)
 *  - expo-sqlite/kv-store → a Map (persisted zustand stores)
 *  - expo-file-system → a set of file paths (meal photos)
 * Everything is kept on globalThis, so `jest.resetModules()` behaves like
 * closing and reopening the app: memory is gone, the "disk" stays.
 */

type Param = string | number | null | boolean | undefined;

type Disk = { dbs: Map<string, DatabaseSync>; kv: Map<string, string>; files: Set<string> };
const disk = (): Disk => {
  const g = globalThis as { __simDisk?: Disk };
  g.__simDisk ??= { dbs: new Map(), kv: new Map(), files: new Set() };
  return g.__simDisk;
};

/** Wipe the phone: database, key-value store and files (a fresh install). */
export function wipePhone() {
  const d = disk();
  d.dbs.forEach((db) => db.close());
  d.dbs.clear();
  d.kv.clear();
  d.files.clear();
}

export const photoFiles = () => [...disk().files];

const bind = (params: Param[]) =>
  (params.length === 1 && Array.isArray(params[0]) ? (params[0] as Param[]) : params).map((p) =>
    p === undefined ? null : typeof p === 'boolean' ? Number(p) : p,
  );

export function openDatabaseSync(name: string) {
  const d = disk();
  if (!d.dbs.has(name)) d.dbs.set(name, new DatabaseSync(':memory:'));
  const db = d.dbs.get(name)!;
  let depth = 0;
  return {
    execSync: (sql: string) => db.exec(sql),
    runSync: (sql: string, ...params: Param[]) => {
      const r = db.prepare(sql).run(...bind(params));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getFirstSync: <T>(sql: string, ...params: Param[]) => (db.prepare(sql).get(...bind(params)) ?? null) as T | null,
    getAllSync: <T>(sql: string, ...params: Param[]) => db.prepare(sql).all(...bind(params)) as T[],
    withTransactionSync: (fn: () => void) => {
      if (depth) return fn();
      depth += 1;
      db.exec('BEGIN');
      try {
        fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      } finally {
        depth -= 1;
      }
    },
  };
}

export const Storage = {
  getItemSync: (key: string) => disk().kv.get(key) ?? null,
  setItemSync: (key: string, value: string) => void disk().kv.set(key, value),
  removeItemSync: (key: string) => void disk().kv.delete(key),
};

const DOCS = 'file:///data/user/0/ai.sar.app/files';

class FakeFile {
  readonly uri: string;
  constructor(parent: FakeDirectory | string, name?: string) {
    this.uri = typeof parent === 'string' ? parent : `${parent.uri}/${name}`;
  }
  get exists() {
    return disk().files.has(this.uri);
  }
  create() {
    disk().files.add(this.uri);
  }
  delete() {
    disk().files.delete(this.uri);
  }
  move(dest: FakeFile) {
    disk().files.delete(this.uri);
    disk().files.add(dest.uri);
  }
}

class FakeDirectory {
  readonly uri: string;
  constructor(parent: FakeDirectory | string, name?: string) {
    this.uri = typeof parent === 'string' ? `${parent}/${name}` : `${parent.uri}/${name}`;
  }
  get exists() {
    return true;
  }
  create() {}
}

export const fileSystem = {
  File: FakeFile,
  Directory: FakeDirectory,
  Paths: { document: DOCS, cache: `${DOCS}/../cache` },
};

/** A photo straight from the camera (in the cache folder, like expo-camera). */
export function cameraPhoto(name: string) {
  const uri = `${DOCS}/../cache/Camera/${name}.jpg`;
  disk().files.add(uri);
  return { uri, width: 3000, height: 4000 };
}
