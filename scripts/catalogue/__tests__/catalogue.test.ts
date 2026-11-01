/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { catalogueOutputs } from '../outputs.ts';

const DIR = join(__dirname, '../../../catalogue');

describe('catalogue/', () => {
  const { files, results } = catalogueOutputs(DIR);

  it('has no recipe errors', () => {
    const errors = [...results].flatMap(([id, r]) => r.errors.map((e) => `${id}: ${e}`));
    expect(errors).toEqual([]);
  });

  it.each(Object.keys(files))('%s is up to date (run npm run catalogue:build)', (name) => {
    expect(readFileSync(join(DIR, name), 'utf8')).toBe(files[name]);
  });
});
