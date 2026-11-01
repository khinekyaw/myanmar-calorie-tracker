/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { calculate, catalogueJson, linesCsv, reviewCsv, type Ingredient, type Recipe } from './calc.ts';

/** Reads catalogue/ (ingredients.json + recipes/*.json) and calculates every recipe. */
export function loadCatalogue(dir: string) {
  const ingredients: Record<string, Ingredient> = JSON.parse(readFileSync(join(dir, 'ingredients.json'), 'utf8'));
  const recipes: Record<string, Recipe> = {};
  for (const file of readdirSync(join(dir, 'recipes')).filter((f) => f.endsWith('.json'))) {
    recipes[file.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(dir, 'recipes', file), 'utf8'));
  }
  return { ingredients, recipes, results: calculate(ingredients, recipes) };
}

/** Generated files, by path inside catalogue/. */
export function catalogueOutputs(dir: string) {
  const { ingredients, results } = loadCatalogue(dir);
  const files: Record<string, string> = {
    'calculated.json': JSON.stringify(catalogueJson(results), null, 2) + '\n',
    'review.csv': reviewCsv(results),
    'review-lines.csv': linesCsv(results, ingredients),
  };
  return { files, results };
}
