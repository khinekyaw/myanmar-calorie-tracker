-- Sugar and sodium per unit, for the blood-sugar and salt features
-- (LAUNCH_CHECKLIST.md). Null until a dish has them. Dishes whose numbers come
-- from the recipe calculation (docs/CATALOGUE.md) have source = 'recipe'.
alter table public.dishes
  add column sugar_g numeric(6, 1) check (sugar_g >= 0),
  add column sodium_mg numeric(7, 0) check (sodium_mg >= 0);
