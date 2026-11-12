# Sar AI — Product brief

Calorie-tracking app for Myanmar, modelled on Cal AI's photo logging and adapted to how people in Myanmar actually eat.

**Name: Sar AI**, from Burmese စား ("eat"). The wordmark in the app is "Sar AI".
- A quick web search (Oct 2026) found no food or calorie app with this name. Run a proper trademark and Play Store check before launch.
- Other names considered: Ahara (taken by a US nutrition company), Bojana, Sukha, Ayu, Pankan.

UI design canvas (22 screens, Claude Design): https://claude.ai/artifact/DYDw9tRFavDJruN3XiGX6M

---

## 1. Product decisions

- **Market:** Myanmar first. Thailand later; the Burmese diaspora is a higher-paying segment for the same database.
- **Platform:** Android first, built for cheap phones (360×800 dp, 2–3 GB RAM, slow or patchy data). iOS later.
- **The moat is the food data, not the app.** A verified set of 200–300 common Myanmar dishes, each with portions in local units, kcal and macros, Burmese name variants and real photos. The AI identifies the dish and portion, then uses the verified numbers. It only falls back to its own estimate when no dish matches.
- **Targets in local terms:**
  - Carbs as **plates of rice** ("ထမင်း 3 ပန်းကန်").
  - Nutrient words ကစီ(ဓာတ်) / အသား(ဓာတ်) / အဆီ(ဓာတ်), not "carbs/protein".
  - A gradual rice cut: 4 → 3½ → 3 plates.
- **Shared-meal logging (ဝိုင်းစား):** one list of the table's dishes, each with a stepper for how much you ate: rice in plates, each curry in spoonfuls, soup and ngapi like any other dish (changed 2026-11-03, see DECISIONS.md).
- **Input methods:** photo, voice (Burmese, primary), text, search, quick re-log chips. Search must match Unicode, Zawgyi, romanized spellings ("laphet yay", "mohinga", "mont hin gar") and spelling variants.
- **Offline-first:** text, voice and search logging work offline. Photos are compressed (~800px; the server gets a 512px copy for scanning) and queued until a connection returns. Option to send photos on Wi-Fi only.
- **Monetization:** free tier 3 photo scans/day in the first week, then 1/day (since 2026-11-01; [reports/Unit economics.md](../reports/Unit%20economics.md)); voice, text, search unlimited. **Prepaid passes** (1 and 3 months) in kyat via KBZPay / WavePay, no auto-renew (screens say so). Paywall only after free scans are used up, never during onboarding. ⚠️ Check Google Play payments policy; Play Billing (MMK) is the fallback.
- **Login:** email code first, Google second (first version; phone OTP (+95) later, once an SMS route is affordable — DECISIONS → Email sign-in). **No Facebook** (blocked without VPN).
- **Cultural features:** "ထမင်းစားပြီးပြီလား?" reminder; ဥပုသ်နေ့ vegetarian toggle; အလှူ / feast-day mode that doesn't break the streak; health goals for သွေးချို and သွေးတိုး; waist size as an alternative to weight; BMI with Asian cut-offs.
- **Copy rules:** minimal text (one short headline per screen, no helper paragraphs); spoken register ("…မယ်"), not "…သည်"; Burmese text ≥ 13px; weekday labels လာ ဂါ ဟူး ကြာ သော နေ နွေ.

## 2. Design system (original handoff values)

| Token | Value |
|---|---|
| Ink (primary, buttons, selected) | `#111217` (was `#0A0A0A`) · accent gold `#DEA84A` for brand/premium moments |
| Muted text | `#666666` (on white), `#71717A` (inactive) |
| Surface / cards | `#F4F4F5`, ring track `#E4E4E7` |
| Hairline | `#EFEFEF` |
| Background | `#FFFFFF` |
| Carbs / rice | `#EDB75A` (softened from `#F5A524`, 2026-10-31) |
| Protein | `#E5674B` |
| Fat | `#8B5CF6` violet (was `#3E7BFA` blue; changed 2026-10-30 because blue + a drop read as water) |
| Fonts | Inter + Noto Sans Myanmar |
| Radius | cards 20–24, options 16, buttons pill (56px tall) |

Colour only on nutrient indicators. No card borders; shadows only on the floating + button and bottom sheets. Selected options are solid black; unselected `#F4F4F5`. Bottom nav: icons only (Home, Progress, Settings) plus a floating black + button.

In code these live in `src/theme/` — see [ARCHITECTURE.md](ARCHITECTURE.md#theming).

## 3. Screens (canvas file names)

**Onboarding:** 01 Main (Welcome) · 02 AboutYou · 03 Workday · 04 Goal · 05 TargetWeight · 06 EatingHabits · 07 Notifications · 08 Generating · 09 PlanReady · 10 SignIn
**Core:** 11 Home · 12 AddSheet · 13 Camera · 14 Result · 15 SharedMeal · 16 PickDish · 17 TextLog · 18 FoodSearch · 19 Analyzing
**Account:** 20 Progress · 21 Settings · 22 Paywall

Main flow: Home → + → Camera → Result → (ဝိုင်းစား → SharedMeal) or (ပြင်မယ် → PickDish) → save → Home.

## 4. Data model sketch

```
profiles(id, sex, birth_year, height_cm, weight_kg, workday, goal, pace, health_flags[], rice_plates_target, kcal_target, lang)
dishes(id, name_my, name_en, aliases_my[], aliases_zawgyi[], aliases_roman[], category, default_unit, unit_grams, kcal, carb_g, protein_g, fat_g, is_vegetarian, oil_sensitive, sweetness_options, source, verified_by)
food_logs(id, user_id, eaten_at, meal_slot, source[photo|voice|text|search|quick], photo_path, status[queued|processing|done|failed], is_shared_meal)
log_items(id, log_id, dish_id, qty, unit[plate|bowl|spoon|piece|cup], oil_level, sweetness, kcal, carb_g, protein_g, fat_g)
weights(id, user_id, measured_at, weight_kg, waist_cm)
passes(id, user_id, plan[1m|3m], starts_at, ends_at, payment_provider, payment_ref)
scan_quota(user_id, date, used)
day_flags(user_id, date, uposatha, feast_day)
```

## 5. AI scan contract

Request: image + list of candidate dishes `{id, name_my, name_en}`. Response (JSON only):

```json
{
  "shared_table": false,
  "items": [
    {"dish_id": "mohinga", "name_my": "မုန့်ဟင်းခါး", "qty": 1, "unit": "bowl", "confidence": 0.86}
  ]
}
```

- Prefer `dish_id` from the list; `null` + estimated nutrition only when nothing matches.
- Confidence < ~0.6 → PickDish with top 3. `shared_table: true` → SharedMeal.
- Curries default to oil level "normal"; user can adjust.

## 6. v1 scope

1. Onboarding + plan calculation (Mifflin-St Jeor + workday activity factor), targets in rice plates.
2. Home, AddSheet, Camera → Result → SharedMeal and PickDish.
3. Search with romanized + Zawgyi matching, quick re-log, tea sweetness.
4. Offline queue + photo compression.
5. Seed database of 50 dishes → 200–300 with a nutritionist.
6. Email code login (phone OTP later).

Later: voice, passes and payments, Progress charts, barcode, health reports, Thailand.

## 7. Open items

- Nutritionist name, pass prices and all nutrition numbers in designs are illustrative. ~260 kcal per rice plate needs validation.
- Burmese copy needs native-speaker review.
- Check Google Play billing rules before the payment flow.
- Check licensing for reference data (e.g. FAO Myanmar Food Atlas 2022) before commercial use.

## 8. Background

- Cal AI is the model: >$40M sales in the 12 months before MyFitnessPal acquired it (March 2026).
- Apple temporarily pulled Cal AI (April 2026) over paywall design — keep trial and payment terms honest.
- A Burmese-user critique drove section 1: shared meals, rice plates, prepaid passes, offline + voice, no Facebook login, fewer onboarding screens.
