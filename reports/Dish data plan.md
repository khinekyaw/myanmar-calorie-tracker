# Dish data plan: first 100, then 500–1,000 by launch

November 2026. Research and a fast plan for building the dish catalogue.

## The short answer

There is no Myanmar dish database we can download and use commercially. The fastest reliable route is the method nutritionists already use: **recipe calculation**.

- Write a standard recipe for each dish: raw ingredient grams, cooked weight and serving grams.
- Compute the nutrition in code from ingredient tables.
- Have the nutritionist review it.

An LLM drafts the recipes, but **never the final numbers**: code computes those from the ingredient tables. Get to 1,000 by combining four things:

| Block | Count | How |
|---|---|---|
| Core Myanmar dishes, reviewed one by one | ~150 | recipe calculation + nutritionist |
| Variants from templates (curry × protein, salad × base) | ~250 | same base recipe, swap the protein or vegetable |
| Indian-, Chinese- and Shan-style dishes eaten daily | ~150 | recipe calculation, checked against Indian/Thai/Singapore data |
| Packaged food and drinks (3-in-1 coffee, instant noodles, snacks, soft drinks) | ~200 | from the label, a minute each |
| Single foods (fruit, egg, bread, rice types, plain drinks) | ~150 | straight from USDA |

Only the first block needs real nutritionist time. The figure of 1,000 is honest only if the app shows which tier each entry belongs to. The data model already has `source` and `verified_by`.

## What exists (and why most of it can't be used directly)

| Source | What it has | Can we use it? |
|---|---|---|
| **DMR Yangon, Nutrition Research Division**: Myanmar Food Composition Tables (1994, 2002) plus *lab-analysed* snacks and mixed dishes, updated annually, kept in Excel ([DMR country report, 2011](https://inmu.mahidol.ac.th/aseanfoods/doc/05_Country%20Report%20(Myanmar).pdf)) | Raw foods and mixed dishes such as pork curry, hilsa curry, fried water spinach and mohinga, per 100 g | **Best source, but not public.** Ask for a licence. The lead time will be long, so start now and use it to validate our numbers. |
| [FAO Myanmar Food Atlas (2022)](https://openknowledge.fao.org/3/cc0394en/cc0394en.pdf) | Exchange-list photos of *single foods* (rice, protein, fruit, vegetables) and household utensil sizes | **No mixed dishes and no kcal.** Licence is CC BY-NC-SA, so **non-commercial**. Useful only for unit sizes: plate 8″, bowl 4.5″ × 2″. (This corrects the market research report, which listed the Atlas as a main source.) |
| [Thai FCD (INMU, v3 Aug 2025)](https://inmu.mahidol.ac.th/thaifcd/home.php) | ~1,700 items, including a "Mixed foods: ready-to-eat" group | Free for non-commercial use only; commercial use may carry fees ([terms](https://inmu.mahidol.ac.th/thaifcd/content/term-and-condition)). Good for Shan and Thai-style dishes and for local ingredients like fish paste. |
| [USDA FoodData Central](https://fdc.nal.usda.gov/) | Thousands of raw and cooked ingredients, yield and retention factors | **CC0 public domain, commercial OK.** Our ingredient base. |
| [Indian Nutrient Databank](https://pmc.ncbi.nlm.nih.gov/articles/PMC11277795) | 1,014 Indian recipes computed from IFCT 2017 | Described as open access, but the dish data's licence is unclear. Use it as a cross-check for palata, biryani, dal, samosa and dosa. |
| [Singapore SG FoodID (HPB)](https://www.hpb.gov.sg/healthy-living/food-and-beverage/sgfoodid/) | Analysed Chinese, Indian and Malay hawker dishes | Check the [terms](https://file.go.gov.sg/termsofuse-hpbsgfoodid.pdf) before reuse. Good cross-check for fried rice, noodles and biryani. |
| [Bangladesh FCT 2013 (FAO)](https://www.fao.org/food-composition/tables-and-databases/detail/(country--date)-title-1/en) | Raw foods, Excel, free | Gap-filler for South Asian ingredients and fish. |
| [Chupeerach et al. 2021, *NFS Journal*](https://doaj.org/article/e757b88f757d4218b849b1d40bd5f8ae) (Mahidol) | Myanmar curry recipes and set menus, computed with INMUCAL | Open-access paper. Its recipes are a ready-made template and check for curries. |
| [Mahidol: Myanmar protein and calorie booklet for kidney patients](https://repository.li.mahidol.ac.th/items/038f4f02-1edc-4a82-9e19-85a9eabcd998/full) | Myanmar dishes recalculated from the Myanmar FCD | Contact the authors: they've already done part of this work. |
| MyFitnessPal / FatSecret entries | Crowdsourced | **Don't use.** Against their terms, and inconsistent. |

## Why recipe calculation, and where the LLM fits

- It's the standard method. DMR's own tables include "calculated data", and the Chupeerach paper and INDB use the same method.
- Studies find LLMs are weakest at estimating kcal for **mixed and culturally specific dishes and sauces**. Accuracy improves when they get ingredient lists or a food table as context ([Nutrients, GPT-5 images, 2025](https://repositorio.unini.edu.mx/id/eprint/17880); [Finnish cafeteria study](https://www.utupub.fi/bitstreams/28c52bb8-6313-4b7f-a0ca-3056ef0ea250/download)). So the LLM writes the recipe and the code does the arithmetic.
- **Portion size causes more error than composition.** A curry-shop portion of pork curry can easily be twice another shop's. Weighing real portions matters more than any table.

## Plan

### Week 1: the first 100

1. **Dish list (day 1–2).** Draft ~400 candidates from Burmese cookbooks, curry-shop and tea-shop menus, and our 15 mock dishes. Rank them by how often people eat them. The quickest signal is ~20 people (team, friends, the nutritionist's clients) listing what they ate for a week. Pick the top 100, weighted toward **lunch**: rice + curry + soup + vegetable + ngapi yay. Rice stays a separate "plate" entry, so curries are logged per portion *without* rice.
2. **Recipe drafts (day 2–3, LLM).** For each dish: 2–3 published recipes → one standard recipe in raw grams, cooking method, cooked yield and serving grams. Each ingredient maps to a USDA FDC ID, or a Thai/ASEAN ID marked "needs licence".
3. **Compute (code).** Nutrition = Σ ingredients × retention factors ÷ yield, × serving grams. Add oil absorption for fried dishes (it feeds the existing oil less/normal/more chip). Output kcal, carbs, protein and fat, plus **sugar and sodium** now, because the Premium features need them later.
4. **Weigh real portions (weekend, in Yangon).** Buy ~30 lunch dishes from 3–4 curry shops and tea shops, weigh each with a kitchen scale and photograph them. The photos double as dish photos and as AI test images.
5. **Nutritionist review.** Plan for roughly 10–15 minutes per dish once the draft is in front of them: check the recipe and the portion, then sign off (`verified_by`). That's about 2–3 days for 100. This is our guess, so confirm it on the first 10.

### Weeks 2–6: scale to 500–1,000

- **Templates.** Most Myanmar curries share a base of oil, onion, garlic, ginger, turmeric and chilli, used across ~6 styles (ဟင်း, ဆီပြန်, နှပ်, အချဉ်, ကြော်, အုပ်) and ~8 proteins (chicken, pork, beef, mutton, fish, prawn, egg, duck). One reviewed template gives up to 48 entries. The same works for thoke (salads), soups (ဟင်းချို, ချဉ်ရည်), fried vegetables, fried rice and noodles.
- **Other cuisines eaten daily.** Indian-Myanmar (palata, biryani, dosa, puri, samosa, dal), Chinese-Myanmar (fried rice, noodles, kyay oh, dim sum), Shan (Shan noodles, tofu dishes). Calculate them the same way and cross-check against INDB, Singapore and Thai values.
- **Packaged and drinks.** Photograph labels in a City Mart or convenience store (3-in-1 coffee, Premier, instant noodles, snacks, soft drinks, energy drinks), plus [Open Food Facts](https://world.openfoodfacts.org/) (ODbL). Fast, and genuinely used.
- **Single foods** straight from USDA.

### Start now (long lead time, runs in parallel)

- Ask **DMR Nutrition Research Division (Yangon)** and the **National Nutrition Centre** for their analysed mixed-dish data under licence. Use it to check our calculated numbers, starting with the top 20.
- Ask **INMU Mahidol** about a commercial licence for Thai FCD / INMUCAL. They have also worked on Myanmar recipes (Chupeerach; the kidney-patient booklet).
- Later, if budget allows: lab proximate analysis of the top ~20 dishes. Cost not researched.

## In the app

- Three tiers, shown honestly: **Verified** (nutritionist signed off), **Calculated** (recipe-calculated, not yet reviewed), **Estimate** (AI fallback). This extends today's Verified/Estimate badge.
- Store each recipe (ingredients, grams, yield, source IDs) next to the dish so any number can be traced and recomputed when a source changes. The catalogue is already versioned and server-updatable, so more dishes ship without an app release.
- Ship with ~150 Verified and the rest Calculated. Promote dishes to Verified in order of how often users log them.

## Don't

- Don't let the LLM output kcal directly into the catalogue.
- Don't copy FAO Atlas, Thai FCD or ASEAN values commercially without a licence.
- Don't scrape MyFitnessPal or FatSecret.
- Don't count 1,000 entries as "verified" when ~150 are.
