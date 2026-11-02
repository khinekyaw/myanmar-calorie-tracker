-- Cooked grams in one unit (plate, bowl, serving spoon, piece, cup), shown
-- next to the amount so a "serving spoon" isn't read as a tablespoon. From the
-- recipe calculation (docs/CATALOGUE.md); null until a dish has it.
alter table public.dishes
  add column serving_g numeric(5, 0) check (serving_g > 0);
