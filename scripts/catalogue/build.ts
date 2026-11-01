/// <reference types="node" />
/**
 * Calculates every recipe in catalogue/recipes/ and writes calculated.json and
 * the nutritionist's review sheets (review.csv, review-lines.csv).
 *
 *   npm run catalogue:build
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isComponent, roundNutrients } from './calc.ts';
import { catalogueOutputs } from './outputs.ts';

const DIR = join(import.meta.dirname, '../../catalogue');
const { files, results } = catalogueOutputs(DIR);
for (const [name, content] of Object.entries(files)) writeFileSync(join(DIR, name), content);

let errors = 0;
for (const [id, r] of results) {
  const s = r.perServing && roundNutrients(r.perServing);
  const head = s
    ? `${s.kcal} kcal / ${r.recipe.servingG} g ${r.recipe.unit}`
    : isComponent(r.recipe)
      ? `${Math.round(r.per100g.kcal)} kcal / 100 g (component)`
      : '—';
  console.log(`${id.padEnd(16)} ${head}`);
  for (const e of r.errors) console.log(`  ERROR ${e}`);
  if (r.placeholders.length) console.log(`  placeholder: ${r.placeholders.join(', ')}`);
  errors += r.errors.length;
}
const dishes = [...results.values()].filter((r) => !isComponent(r.recipe));
const reviewed = dishes.filter((r) => r.recipe.status === 'reviewed').length;
console.log(`\n${dishes.length} dishes, ${reviewed} reviewed, ${errors} errors. Wrote ${Object.keys(files).join(', ')}.`);
if (errors) process.exit(1);
