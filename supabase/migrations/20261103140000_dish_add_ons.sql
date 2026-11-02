-- Toppings and sides often added to a dish (eggs and fritters on mohinga, a
-- fried egg on rice), offered as one-tap chips on Result. Dish ids, from the
-- recipe's `addOns` (docs/CATALOGUE.md).
alter table public.dishes
  add column add_ons text[] not null default '{}';
