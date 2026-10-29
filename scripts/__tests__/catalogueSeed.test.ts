/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { dishes } from '@/mocks/dishes';

import { catalogueSeedSql } from '../catalogueSeed';

const SEED = join(__dirname, '../../supabase/seeds/catalogue.sql');

describe('supabase/seeds/catalogue.sql', () => {
  it('matches the bundled dish list', () => {
    const sql = catalogueSeedSql(Object.values(dishes));
    if (process.env.UPDATE_SEED) writeFileSync(SEED, sql);
    // Out of date? Run: UPDATE_SEED=1 npx jest scripts/__tests__/catalogueSeed.test.ts
    expect(readFileSync(SEED, 'utf8')).toBe(sql);
  });

  it('escapes quotes', () => {
    const sql = catalogueSeedSql([{ ...dishes.tea, name: { my: 'x', en: "Grandma's tea" } }]);
    expect(sql).toContain("'Grandma''s tea'");
  });
});
