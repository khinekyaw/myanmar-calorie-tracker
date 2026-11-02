# Dish catalogue: recipe calculation

How dish numbers are made. Every dish gets a **standard recipe**. Code calculates its nutrition from an **ingredient table**, and the nutritionist reviews it. Why this method, and the plan to reach 500–1,000 dishes: [reports/Dish data plan.md](../reports/Dish%20data%20plan.md).

The app reads `catalogue/calculated.json`. `src/data/dishes.ts` builds every dish from it (names, aliases, flags, unit, numbers) and only adds bundled photos, and the server seed is generated from that. Result shows **Verified** (reviewed), **Calculated** (draft recipe) or **Estimate** (no recipe).

## Files

```
catalogue/
  ingredients.json      ingredient table, per 100 g (kcal, carbs, protein, fat, sugar, sodium)
  recipes/<id>.json     one standard recipe per dish; <id> = the app's dish id
  calculated.json       GENERATED: nutrition per serving for every dish without errors
  review.csv            GENERATED: one row per dish, for the nutritionist
  review-lines.csv      GENERATED: where each dish's calories come from, line by line
scripts/catalogue/
  calc.ts               the maths and checks (pure; tested in __tests__/calc.test.ts)
  ingredients.ts        fills USDA values into ingredients.json
  build.ts              writes the generated files
```

Commands (Node ≥ 23.6 runs the `.ts` files directly):

```bash
npm run catalogue:build
```

```bash
npm run catalogue:ingredients -- <path to FoodData_Central_sr_legacy_food_csv_2018-04>
```

`npm test` fails when a recipe has errors or the generated files are out of date.

After a build that changes numbers:
1. Run `UPDATE_SEED=1 npx jest scripts/__tests__/catalogueSeed.test.ts` to regenerate the server seed.
2. Bump `CATALOGUE_VERSION` and `CATALOGUE_DATE` in `src/db/dishes.ts` so phones re-seed.
3. A new dish needs nothing else in the app. Only a bundled photo goes in `dishPhotos` in `src/data/dishes.ts`.

## Ingredients

- **USDA first.** Add `"fdcId"` with null values, then run `catalogue:ingredients` to fill them in, along with `usdaName`. The data is SR Legacy, CC0: [download](https://fdc.nal.usda.gov/download-datasets) the CSV. Find ids by searching `food.csv`, or at [fdc.nal.usda.gov](https://fdc.nal.usda.gov/).
- **Hand-entered** values (a product label, a paper, a licensed table) need a `source`.
- **No value yet?** Add `"placeholder": true` with a rough guess. Every dish that uses it is flagged and can't be marked reviewed. Today there are five: `laphet`, `ngapi`, `bananaStem`, `driedShrimp`, `sugarcaneJuice`.
- When USDA has nothing close, a proxy is fine if its name says so: "Dried salted fish (cod, proxy)".
- Don't copy values from the Thai, ASEAN or FAO tables until we have a commercial licence.

## Recipes

```jsonc
{
  "id": "samusa",                       // = file name = app dish id; "_" prefix = component
  "name": { "en": "Samosa", "my": "စမူဆာ" },
  "aliases": { "roman": ["samusa", "samosa"], "my": ["စမူဆာ"] },   // what people type or say
  "addOns": ["boiledEgg"],              // toppings / sides often added: one-tap chips on Result
  "oilSensitive": true,                 // also hasSweetness, isVegetarian
  "unit": "piece",                      // plate | bowl | spoon (a serving spoon) | piece | cup
  "servingG": 45,                       // cooked grams in one unit
  "servingWeighed": false,              // true once someone weighed real portions
  "yieldG": 1250,                       // whole batch after cooking; omit if nothing is lost
  "yieldWeighed": false,
  "lines": [
    { "ing": "potato", "g": 500 },                      // raw grams
    { "ing": "peanutOil", "absorbed": 0.10 },           // deep-frying: oil soaked up, share of yieldG
    { "dish": "_mohingaBroth", "g": 350 }               // cooked grams of another recipe
  ],
  "method": "…", "sources": ["https://…"], "status": "draft", "notes": "…"
}
```

- **Batch recipes** (curries, dough, broth) list the raw ingredients for a whole pot. `yieldG` is what the pot weighs after cooking, so water lost to cooking is counted. **Assembled dishes** (a bowl of mohinga, a rice plate, a salad) list one serving and leave out `yieldG`.
- **Components** (`_mohingaBroth`, `_friedSplitPeas`, `_naan`) are shared parts. They have no unit and are never logged. They work as templates: one reviewed curry base can serve every protein.
- Weights are edible portions: no bones, peels or discarded stalks. Use `kept` for anything partly removed (lemongrass, pan-frying oil that stays in the pan).
- **Deep-frying oil** is `absorbed`: the oil the food soaks up, as a share of the cooked batch (`yieldG`), whatever was in the pan. Pick the type:

  | Fried food | `absorbed` | Dishes |
  |---|---|---|
  | Dough or batter | 0.18 | fried dough stick, puri, split pea / gourd / onion fritters |
  | Pastry around a filling | 0.10 | samosa, spring roll |
  | Starchy pieces | 0.12 | fried Shan tofu |
  | Whole pieces, little batter | 0.08 | fried chicken, fried fish, fish cake |
  | Small crisp bits | 0.20 | fried dried fish, fried split peas |

  Published oil contents of fried foods: doughnuts 20–25 %, french fries 10–15 %, potato chips 33–38 %, most fried snacks 20–40 % ([Moreira et al. 1999, cited here](https://www.ahealthylife.nl/wp-content/uploads/2018/06/deep-fat_vs_air-frying.pdf)); doughnuts absorb 15–20 % of their weight ([Grasas y Aceites, 1998](https://doaj.org/article/fed67d570f2d4e5889832fb84444652c)). The values above are placed inside those ranges for our foods. No study measured Burmese dishes; replace a value when one is measured or the nutritionist sets it.
- **Units:** `spoon` is a **serving spoon** (ဟင်းခပ်ဇွန်း), not a tablespoon: 30 g of curry, 40 g of vegetables, 15 g of relish. The app shows the grams next to the amount (`servingG`, also in the server's `dishes.serving_g`).
- Water and salt are ingredients. Leaving out the water makes `yieldG` look too high, and the build catches that.

The checks. **Errors** fail the build: unknown ingredient, `absorbed` without `yieldG` or above 0.5, a recipe used inside itself, cooked weight above the ingredient weight, more than 900 kcal per 100 g, a missing unit or serving, reviewed without `reviewedBy`, reviewed with placeholders. **Warnings** go in the review sheet: kcal and 4/4/9 differ by more than 15 %, no source recipe, a nutrient with no value for an ingredient making up 5 % or more of the batch.

## Drafting a dish (person or Claude)

1. Find 2–3 published recipes (Burmese cookbooks, well-known Burmese recipe sites or YouTube cooks). Put the links in `sources`.
2. Write one standard recipe in raw grams, using existing ingredient ids where you can. Add missing ingredients from USDA first.
3. Estimate `yieldG` and `servingG`. Leave `*Weighed` false until someone weighs them.
4. Run `npm run catalogue:build` and check the dish's kcal per 100 g against similar dishes.
5. Keep `status: "draft"`. Never type nutrition numbers into a recipe: they come only from the ingredients.

The first 15 recipes were drafted by Claude from general knowledge, with no sources checked. Their notes say so.

## Review (nutritionist)

1. Open `review.csv` and `review-lines.csv` in Google Sheets or Excel. Burmese shows correctly.
2. For each dish, check the recipe, the portion and which lines carry the calories. Fix the recipe file, not the numbers.
3. To sign off, set `"status": "reviewed"`, `"reviewedBy"` and `"reviewedAt"`, then rebuild. The build refuses while the dish still uses a placeholder.

The **biggest error is portion size**. Weigh real servings: a serving spoon of curry, a shop's palata, a curry-shop plate. Then set `servingWeighed` / `yieldWeighed`.

## What's missing (food not on the list)

- **Fallback types:** 11 "Other …" dishes (`"generic": true`, ids `other…`): meat curry, fish or seafood curry, vegetable dish, salad, rice dish, noodle soup, noodle dish, soup, fried snack, snack or sweet, sweet drink. Each is equal parts of the dishes of that type, at their average serving weight, so it moves with them. They show *Estimate* (server `dishes.source = 'generic'`), stay out of plain search results, and are listed under the results as *Not here? Pick the closest type*. Add a new dish to its type's recipe.
- **Scans:** a food not on the list is kept under its closest type with the AI's own estimate (`log_items.custom`).
- **What to add next:** `catalogue_misses` on the server counts searches that found nothing (sent with sync) and unknown foods in scan answers. Check it before choosing the next dishes.

## Not done yet

- **Sugar and sodium** reach the phone and server dish catalogue, but not logged meals (`log_items`), and no screen shows them.
- **Curry `spoon` = 30 g** is a guess.
- **The 151 drafts have no sources.** Check them against published recipes, starting with the dishes users log most.
- **Burmese names and spellings** for the 100 dishes added on 2026-11-01 need native review.
- **Placeholder values:** laphet, ngapi, banana stem, dried shrimp and sugarcane juice.
- **Proxies** worth replacing: shad for hilsa, surimi for knifefish paste, roselle calyx for leaves, goat for mutton (likely right), brown sugar for jaggery.
- **Staging and production** need the new migration and the regenerated seed when they're set up. The seed never overwrites a row that already exists.
