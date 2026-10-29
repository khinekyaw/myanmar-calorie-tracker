# Sar AI — Decision log

Newest first. Each entry: what we decided, why, and what would make us revisit it.
Product-level decisions from the handoff are in [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md).

---

## 2026-10-30 — Polish: day circle, protein icon, badges

- The selected week day was a fill on top of an invisible dashed border, and the dashes left a jagged edge. Each look (selected / logged / plain) now mounts as its own view (keyed), so the selected day is a clean solid circle.
- Protein icon: **chicken drumstick** instead of the fish (user feedback).
- One `Badge` component for all small pill labels (Verified/Estimate, Best value, Closest, BMI category) with padding sized for Burmese; the old hand-made pills were too tight.

## 2026-10-30 — Brand colours: black #111217, gold accent; gold logo = Premium

- **Primary** black is now `#111217` (was `#0A0A0A`); it's still used for almost everything.
- **Accent** gold `#DEA84A` (sampled from the user's logo artwork, with cream `#FCF8F2`) is for brand and premium moments only: the Premium sparkle in Settings, the paywall badge and "Best value" tag, and the plan-ready check. Ink text sits on gold (white on gold fails contrast). Gold stays away from nutrient indicators, because rice amber `#F5A524` is a similar hue.
- **Logo:** black for everyone; **gold only for Premium members** (user's call), so the gold mark doubles as a membership signal.
- **Premium state** (`store/premium.ts`): a prepaid pass with an end date. Buying on the paywall activates it (MOCK, no payment yet); a new pass extends an active one. Premium hides the free-scan counter and lifts the 3-a-day limit. Settings shows "Active until …". Dev builds: Settings → Developer → "Premium (mock)".

## 2026-10-30 — Weight input: type it or drag a ruler

The ± stepper couldn't change decimals and needed 31 taps to go from 131 to 100. Other trackers either use a horizontal ruler (Cal AI's goal weight and many AI trackers) or a picker wheel with decimals, while MyFitnessPal and Lose It let you type the number. We combine the two quickest: **tap the big number to type it** (decimal keypad, invalid values shown greyed and not applied) and **drag the ruler** for fine changes in 0.1 steps (1 lb ticks, labels every 10 lb; waist ¼-inch ticks, labels every inch; haptic tick on each whole unit). The ruler is `ui/RulerPicker.tsx`; together they are `ui/MeasureInput.tsx`, used on Target weight, Edit goal and Log weight. The Stepper's large variant was removed; ± steppers remain for counts (portions, spoons).

**Welcome image** now shows the whole picture uncropped (it keeps its 768 × 1376 shape and shrinks to the space), and the "Mohinga · 420" chip was removed, as the user asked.

## 2026-10-30 — Flow review: weight & goal tracking, informative Progress

Walked every journey (see [USER_FLOWS.md](USER_FLOWS.md)) and fixed the dead ends: weight/waist logging, editing the goal after onboarding, Settings → Health, plan recalculation, BMI from your real height, per-day history on Home, deleting a meal, barcode marked *Soon*, a real streak.

- **Progress layout** follows the user's reference (goal/current weight cards with actions, then the chart) in our monochrome style: the chart line stays ink, not purple, because colour is reserved for nutrients.
- **Chart** shows y-axis values, dates, a dashed goal line, point markers, and a value bubble you can tap or drag; periods 1M / 3M / All count back from the latest entry.
- **This week** bar chart of calories against the target was added to Progress.
- **Plan recalculation** (`refreshPlan`) uses the latest logged weight, so the target drops as you lose weight.
- **Streak** counts days with a logged meal; a feast day keeps it alive (brief: "feast-day mode that doesn't break the streak").
- **Confirmations** use an in-style bottom sheet (`ConfirmSheet`), not the platform alert, to keep the design rules.
- **Welcome hero** is the user's mohinga scanning image (`assets/images/welcome-mohinga.jpg`, bundled so it works offline), cropped to drop the camera buttons; the app's own scan-frame overlay was removed there because the image has one.
- Weight stays in lb (as in the designs); kg is a follow-up.

## 2026-10-30 — One set of design rules across the app; new logo

Triggered by square corners on the expanded search row. The cause was an Android rendering quirk (see ARCHITECTURE → "Android rounding gotcha"): fixed by remounting with a `key` (search rows, segments) or a constant border width (week days, code boxes). A transparent base background was tried and does not work.

Made consistent with the design system at the same time (rules table in ARCHITECTURE → "Design rules"):
- **No borders on cards:** Result macro tiles and paywall pass cards now use grey fills.
- **Selected = solid ink everywhere:** the selected pass card is black (was a black border); its radio became a white check well.
- **Chips:** outlined chips removed. Grey on white pages (health flags, "+"), white inside grey cards (tea sweetness).
- **"Something else" in PickDish** is a grey option with a mic icon (was a dashed outline).
- **One page gutter (16)** on every screen; onboarding and full-screen pages were 20.
- **Press feedback** unified to two behaviours (options darken, everything else fades to 0.7).
- **Translucent colours** moved into the palette and theme tokens.

**Fat colour and icon:** fat is now violet `#8B5CF6` with a cooking-oil bottle icon (ဆီ), replacing blue + water drop, which read as "water" at a glance. The oil-level chip on Result uses the same bottle. Blue stays only on the BMI scale.

**Logo:** the user's mark (`assets/images/logo.svg`) is now the app icon, Android adaptive/monochrome icon, splash image and in-app logo (Welcome, Home header, reminder preview). Template Expo/React images removed.

## 2026-10-29 — UI prototype: remaining 13 screens

All 22 canvas screens now exist and connect into working flows (see the screen map in [ARCHITECTURE.md](ARCHITECTURE.md#screen-map)). Tested on the Android emulator at 360 dp in both languages.

What changed or was added beyond the canvas:
- **Plan is computed for real** from onboarding answers (`domain/plan.ts`): Mifflin-St Jeor × workday factor, −500 kcal per lb/week, protein 1.6 g/kg, fat 25 %, carbs → plates of rice, gradual rice cut (+1 → +½ → target). Floors at 1,200 / 1,500 kcal. **All rules are PLACEHOLDERS for the nutritionist** and live in one file.
- **Goal "Stay the same" skips Target weight.** Target starts 10 lb from current weight; the date updates with the pace.
- **Eating habits is multi-select** (the canvas showed three selected).
- **Sign in has a code step** (6 boxes) after "Send code"; the canvas had only the phone field. Any code works until Supabase auth is wired.
- **Result** shows a loading state while the photo is analysed, a "Verified" or "Estimate" badge, an oil chip that cycles less / normal / more (only for oil-sensitive dishes), and per-dish macros in grams (carbs as ကစီ grams here; plates of rice stay on Home).
- **Fix on a shared meal opens the shared-meal editor**, not the single-dish picker.
- **SharedMeal** rows show unit and kcal under each dish; "+" opens Search and adds the dish to the table; rows at 0 are dropped on Save.
- **PickDish** without scan runner-ups suggests dishes with the same serving unit first.
- **TextLog** parses Burmese and English offline (`domain/parseMeal.ts`): numbers after the dish in Burmese ("ပလာတာ နှစ်ချပ်"), before it in English ("two palata"), plus tea sweetness words. Keyboard button switches to typing.
- **FoodSearch** matches romanized spellings ("laphet yay", "lahpet ye", "mont hin gar"); tapping a result opens quantity, sweetness (tea) and Add in place. The other-language name shows under each result.
- **Analyzing (19) is a state of Home**, not a separate screen: offline badge in the header, queued photos as "Waiting" cards that become "Analyzing…" and then a logged meal when the connection returns.
- **Home shows "Calories over"** instead of 0 when the day's target is exceeded.
- **Photos are compressed** to 800 px on the long edge before queueing.

Dev-only helpers in Settings → Developer: Simulate offline, Reset free scans, Restart onboarding.

Known prototype gaps: queued scans that come back low-confidence are logged with the top guess and only ask for review when opened; the Android emulator camera returns black photos (real devices are fine); log entries reset when the app restarts.

## 2026-10-29 — UI prototype: first 9 screens

Built to check the approach before the remaining 13: Welcome, AboutYou, Workday, Home, AddSheet, Camera, Progress, Settings, Paywall. They cover every distinct UI pattern on the canvas (onboarding question, number inputs, option list, dashboard, bottom sheet, full-screen camera, chart, settings list, purchase).

Mock data only. Navigation shortcuts until the missing screens exist:
- Workday → Continue goes straight to Home (Goal … SignIn not built).
- Welcome → "I have an account" goes to Home (SignIn not built).
- Camera shutter / gallery uses a free scan and returns Home (Result not built).
- AddSheet → Voice and Search do nothing yet; Barcode opens the camera.
- Settings → Developer → "Restart onboarding" (dev builds only) resets onboarding.

## Stack: Expo SDK 58 + expo-router + TypeScript

Why: one codebase for Android now and iOS later, strongest agent tooling (Expo MCP, skills), file-based routing with typed routes, New Architecture and React Compiler on by default.
Revisit if: a native feature can't be done with a config plugin or Expo module.

## Development build, not Expo Go

Why: Expo Go only supports the newest SDK and its own native modules; production also embeds fonts at build time. `npx expo run:android` builds a dev app once; JS changes still hot-reload.

## Styling: StyleSheet + own theme, no styling library

Options considered: NativeWind, Tamagui, Unistyles, Restyle.
Why: the design system is small; a typed `makeStyles` hook over semantic tokens gives one-place theme changes, re-flows on language change, and adds no runtime or dependency for cheap phones.
Revisit if: we need dark mode plus many variants and the hook gets clumsy (Unistyles 3 is the likely upgrade).

## Theme in three layers (palette → semantic tokens → typography)

Why: the user expects colours, fonts and shapes to change. Components only reference semantic names (`surface`, `textMuted`, `radius.lg`), so a rebrand is an edit to `palette.ts`/`themes.ts`. See [ARCHITECTURE.md → Theming](ARCHITECTURE.md#theming).

## Per-language typography

Burmese and English have separate font, line height (1.7× vs 1.35×), letter spacing, minimum size (13 vs 11) and per-variant size overrides. Numbers and the wordmark always use Inter. See [ARCHITECTURE.md → Burmese vs English typography](ARCHITECTURE.md#burmese-vs-english-typography).

## Text picks its font by script, not only by language

A Latin-only string in the Burmese UI ("Premium", "KBZPay") renders in Inter; a Burmese-only string in the English UI ("မြန်မာ") renders in Noto Sans Myanmar with Burmese line height. Found during emulator testing: without this, brand names fell back to a mismatched font.

## i18n: i18next with typed keys; Burmese is the default language

Why: typed keys catch missing translations at compile time; plurals for English. Burmese default because Myanmar is the first market; the toggle sits on Welcome and in Settings.
Note: many Myanmar phones are set to English, so we deliberately don't follow the device locale on first launch.

## Latin digits in both languages

The designs use Latin digits ("1,085", "2½") in Burmese UI. `lib/format.ts` can switch Burmese to Myanmar digits (၀–၉) with one flag if testing shows users prefer them.

## Units stay imperial on input (ft/in, lb)

As in the designs. Converted to metric in `domain/units.ts` for maths and storage.

## Own SVG icon set

Why: matches the design's stroke icons; avoids an icon-font dependency. All icons are in `src/ui/icons/Icon.tsx`; swapping to lucide or similar changes that file only.

## Placeholder photos from Wikimedia Commons

Real Myanmar dishes (mohinga, laphet thoke, tea, palata, shared table) instead of the canvas's drawn food illustrations. Hot-linked; URLs and licences in `src/mocks/photos.ts`.
**Must replace before launch** with Sar AI's own photos (CC BY-SA would require attribution).

## Design changes from the canvas (kept minimalist)

- Welcome: real food photo in the scan frame; result chip shows the three nutrient-colour dots; language toggle is a two-option segmented pill.
- Workday: icons sit in white rounded squares inside the option for a cleaner rhythm.
- Home: nutrient rings carry small icons (rice plate, egg, drop); calorie ring has a flame; "Today" list uses photo cards with time, kcal and per-meal macros (rice plates, protein, fat).
- AddSheet: quick re-log chips show a small dish photo.
- Camera: full-screen live camera with the scan frame overlay (instead of a framed box).
- Progress: smoothed line with soft fill; BMI card shows the Asian-cut-off scale with a category label.
- Settings: rows grouped under small headers (You / Daily / App); language is an inline segmented control.
- Paywall: feature icons in rounded squares; selected pass has a check and a "Best value" tag on 3 months.

## Tests for domain logic only (for now)

Jest with the `jest-expo` preset covers `domain/` (plan maths, BMI cut-offs, meal parsing, search). UI is checked on the emulator. Component tests can come once screens stop changing. Note: TypeScript 6 no longer loads global types automatically, so `tsconfig.json` lists `"types": ["jest"]`.

## Copy review

All Burmese strings in `src/i18n/locales/my.ts` need native-speaker review. New strings not on the canvas (please check first):
Batch 2 adds (not on the canvas): `target.reachBy` ({{date}} ဆို ရောက်မယ်), `signIn.codeTitle/resend/verify`, `result.analyzing/verified/estimate/oil*`, `shared.addMore`, `textLog.*` (incl. the sample sentence), `search.empty`, `queue.*`, `home.caloriesOver` (ကယ်လိုရီ ကျော်), the `units.*` classifiers (ပန်းကန် / ပွဲ / ဇွန်း / ခု / ခွက်), and Burmese month names in `lib/format.ts`.
Batch 1: `welcome.signIn` was on canvas; new ones: `camera.permissionTitle`, `camera.permissionAllow`, `progress.bmiUnder/Normal/Over/Obese` (အလေးချိန် နည်း / ပုံမှန် / အလေးချိန် များ / အဝလွန်), `paywall.bestValue` (ပိုတန်တယ်), `settings.sectionGoals/Daily/App`, `common.close` (ပိတ်မယ်), `home.today`.

## Open

- Food data source and the ~260 kcal per rice-plate constant (`domain/nutrition.ts`, marked PLACEHOLDER).
- Pass prices (`config/pricing.ts`, `[PRICE]`).
- Payments: KBZPay/WavePay vs Google Play Billing — check Play policy before building.
- Vision model choice for the scan Edge Function.
- SMS provider for +95 OTP.
- Burmese speech-to-text provider for voice logging (on-device vs cloud).
- Plan rules in `domain/plan.ts` (protein g/kg, fat share, deficit caps, rice-cut steps) — nutritionist review.
- Oil and sweetness multipliers in `domain/meal.ts` — per-dish values from the nutritionist.
