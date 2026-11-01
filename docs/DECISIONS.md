# Sar AI — Decision log

Newest first. Each entry: what we decided, why, and what would make us revisit it.
Product-level decisions from the handoff are in [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md).

---

## 2026-10-30 — Backend built: sync, accounts, photo scan, account deletion

Supabase project in `supabase/` (migrations, functions, pgTAP tests); app side in `src/sync/` and `src/services/`. Details: [BACKEND.md](BACKEND.md), [OFFLINE.md → How sync works](OFFLINE.md#how-sync-works). Non-obvious choices:

- **Rows are keyed by `(user_id, id)`**, not `id` alone. When a phone signs in to an existing account it pushes its meals again under that account; the same phone-made id under two accounts must not clash.
- **Two clocks.** The phone's `updated_at` decides conflicts (newest wins, capped at server time + 5 min so a wrong phone clock can't win forever). The server's `synced_at` is the pull cursor, re-read 2 minutes back each time so a write still committing during the last pull isn't missed.
- **One round trip per direction** (`sync_push` / `sync_pull` database functions, running as the user so row-level security applies) instead of one REST call per table, because of slow mobile data.
- **A bad row never blocks sync:** each row is written in its own sub-transaction; refused rows come back in `rejected` and the phone drops them. Where the server's copy was newer, `sync_push` returns it so the phone catches up immediately.
- **No foreign key from `log_items.dish_id` to `dishes`**, so a phone with a newer bundled catalogue can't get stuck. Retired dishes keep their row (`deleted_at`) because old meals use them.
- **Half-finished profiles are never pushed**, and a phone without a finished profile takes the server's. Otherwise "I have an account" on a new phone (empty answers) would overwrite the real profile.
- **Free scans count on the day the photo was taken** (Myanmar time), so photos queued offline overnight use that day's scans; a full day falls back to today; older than 2 days counts as today (limits backdating). A failed scan gives the scan back; a repeated request for the same photo returns the stored answer and isn't charged.
- **Scan model** defaults to `claude-opus-5-5` at **low effort** (short perception task, user is waiting), with the server-side refusal fallback; both settable without a deploy. Every scan records tokens and estimated cost; `SCAN_DAILY_BUDGET_USD` stops scans for everyone if a day's cost runs away.
- **The server's catalogue is unverified**: the seed copies the bundled numbers with `verified_by` empty. Since 2026-11-01 those are recipe-calculated (`source = 'recipe'`), so dishes show *Calculated* until the nutritionist verifies them. (The bundled `verified: true` flags only demo the badge.)
- **Anonymous account for everyone**, linked to the phone number on sign-in. **Phone confirmations must stay on**: testing showed that with them off, linking a number skipped the code check.
- **A token can outlive its deleted account** (up to an hour). `sync_*` check the account exists, and the app then starts a new anonymous account at once instead of syncing into nothing (found in testing).
- **Google sign-in uses Supabase's browser OAuth (PKCE) in an in-app browser sheet** (`expo-web-browser`), not the native Google SDK: one Web OAuth client instead of Android signing-key fingerprints, no dependency on the free google-signin library's deprecated API, and `linkIdentity` keeps an anonymous user's id and data. `expo-crypto` backs a small Web Crypto polyfill (`lib/webCrypto.ts`) so PKCE uses SHA-256. Native one-tap can come later if the browser step feels slow. (2026-10-31; before this the button was a mock, hidden with a backend.)
- **Sample history only in development builds**, so release builds start empty.
- **Builds without `EXPO_PUBLIC_SUPABASE_*` keep the prototype behaviour** (mock scan, any code), so UI work doesn't need the server running.
- **Local SMS:** a database hook logs codes instead of sending (plus fixed test numbers); production needs a provider or a Send SMS hook to a Myanmar gateway.
- **pgTAP tests run by piping into the database container** (`npm run test:db`): on this Mac Docker Desktop has no access to the Desktop folder, which also stops Studio and the functions runtime from mounting the project (see BACKEND.md → Running locally).

## 2026-10-30 — Offline-first storage; backend plan agreed

- **The phone's SQLite database is the source of truth** (`src/db/`): `food_logs`, `log_items`, `weights`, `dishes`, `outbox`, `meta`. Stores load from it at startup and write every change to it first. Rows are sync-ready: UUIDs made on the phone, `updated_at`, tombstones via `deleted_at`, and an `outbox` entry per change. Details: [OFFLINE.md](OFFLINE.md).
- **Meal photos** move from the cache folder (Android can clear it) to app documents (`meal-photos/<log id>.jpg`), so queued scans survive restarts. Added `expo-file-system`.
- **Dish photos are bundled** instead of hot-linked, so they show offline.
- **Free-scan count** is saved per day (closing the app no longer resets it).
- **Dish catalogue** is stored in the database (seeded from the bundled list, versioned) so the server can update it later without an app release.
- Previous builds' weights (key-value store) are migrated into the database on first launch.
- **Backend:** hosted Supabase (Singapore), SQL + TypeScript Edge Functions, phased plan in [BACKEND.md](BACKEND.md). Offline-first was built first because the phone is the source of truth and it fixed the data-loss gap without any accounts.

## 2026-10-30 — Polish: day circle, protein icon, badges

- The selected week day was a fill on top of an invisible dashed border, and the dashes left a jagged edge. Each look (selected / logged / plain) now mounts as its own view (keyed), so the selected day is a clean solid circle.
- Protein icon: **chicken drumstick** instead of the fish (user feedback).
- One `Badge` component for all small pill labels (Verified/Estimate, Best value, Closest, BMI category) with padding sized for Burmese; the old hand-made pills were too tight.

## 2026-10-30 — Brand colours: black #111217, gold accent; gold logo = Premium

- **Primary** black is now `#111217` (was `#0A0A0A`); it's still used for almost everything.
- **Accent** gold `#DEA84A` (sampled from the user's logo artwork, with cream `#FCF8F2`) is for brand and premium moments only: the gold logo for Premium (Settings row, paywall tile on ink; it replaced a sparkle icon on 2026-10-31), the "Best value" tag, and the plan-ready check. Ink text sits on gold (white on gold fails contrast). Gold stays away from nutrient indicators, because rice amber (now `#EDB75A`) is a similar hue.
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
- Home week strip: calorie ring per day, check when a finished day is on target, amber when over (was a dashed ring for any logged day). The selected day is a full-size solid circle (ink; amber with ink text when over).
- Amber softened app-wide to `#EDB75A` (was `#F5A524`): rice indicator, BMI "over", calories over. Brand gold `#DEA84A` unchanged. Rule shared with the badges: `calorieDay` in `domain/badges.ts`; amber via `colors.kcal.over`.
- Home: nutrient rings carry small icons (rice plate, egg, drop); calorie ring has a flame; "Today" list uses photo cards with time, kcal and per-meal macros (rice plates, protein, fat).
- AddSheet: quick re-log chips show a small dish photo.
- Camera: full-screen live camera with the scan frame overlay (instead of a framed box).
- Progress: smoothed line with soft fill; BMI card shows the Asian-cut-off scale with a category label.
- Settings: rows grouped under small headers (You / Daily / App); language is an inline segmented control.
- Paywall: feature icons in rounded squares; selected pass has a check and a "Best value" tag on 3 months.

## Coloured, animated streak fire (2026-10-31)

The streak pill on Home shows an orange fire that flickers (`ui/StreakFlame.tsx`), asked for by the team: a small reward for logging every day. It's the one decorative colour outside nutrients and BMI, kept to that pill only (the calorie ring keeps the ink outline flame). Grey and still when the streak is 0; still when Android's "remove animations" is on. Runs on the UI thread with Reanimated, so it costs nothing on cheap phones' JS thread.

## Milestones: badges worked out on the phone (2026-10-31)

25 badges in six groups (streaks, logging, ways to log, Myanmar favourites, balance, body), list and art prompt in [BADGES.md](BADGES.md). They're computed from data already on the phone each time the screen opens (`domain/badges.ts`), not stored or synced: no schema change, offline, and a second phone shows the same badges because the meals sync. Streak and weight badges use the best ever reached so they're never lost; deleting meals can lower counts. Badge art is the second exception to "colour only on nutrients": full colour when earned, faded greyscale (a view `filter`) when locked, so only one picture per badge is needed. The art is SVG, loaded as an asset by expo-image; generated pictures are traced to SVG with open-source vtracer (`scripts/trace_badges.py`) rather than a paid Figma plan. Art style is deliberately not Cal AI's glossy 3D shields: one soft-shaded object per badge (same family as the streak fire), no frame, no digits, on the app's grey circle with the number in an ink pill drawn by the app. Gold lacquerware medallions were tried and dropped: too ornate and too gold for the app. The "badges earned" hero is a holographic coin drawn in code (`DiamondBadge.tsx`, colours in `colors.holo`), not a generated or traced picture. Not yet: a "you earned a badge" moment after logging.

## Waist hidden for now (2026-10-31)

The Waist tab on Log weight and the weight ↔ waist switch on the Progress chart are removed from the UI to keep Progress simple. The data layer is unchanged: `weights.waist_in` on the phone, `waist_cm` on the server, sync mapping and the `progress.waist` / `logWeight.titleWaist` strings all stay, so bringing it back is a UI change only. Dev sample data still includes waist rows.

## Premium in light gold, not black (2026-10-31)

The black Premium row in Settings and the black selected pass on the paywall read like warnings, not a perk. Premium surfaces now use light gold `accentSoft` (`#F7ECD4`) with ink text: the Settings row (gold logo in a white tile, subtitle = Premium end date, or "Unlimited photo scans" before buying), the paywall's logo tile, and the selected pass (gold check). The KBZPay / WavePay buttons stay ink as the main action.

## Weekly report rules (2026-11-01)

- **Week = Monday to Sunday**, phone time (Myanmar for our users). The notification fires **Monday 8:00** and opens last week. It is a local notification, scheduled only while Settings → Reminders is on and notifications are allowed, and rescheduled when the language changes.
- **Averages are over logged days**, not 7, so an unlogged day doesn't look like a fast. On target / over use the same 85–105 % rule as the week strip and the On Target badge, and only finished days count.
- **Weight change** = last weigh-in of the week minus the last one before it (or the week's first, if there's none before). No weigh-in that week → "No weigh-in".
- **Streak** = the streak as the week ended. **Top dishes** count meals a dish was in, not portions.
- **One tip**, the first that applies: few days logged → log more; rice over the plan → less rice at dinner; protein under 85 % → add egg/fish/chicken; 3+ days over → fried snacks and sweet tea; average under 85 % → don't skip meals; else praise. Thresholds are ours, not the nutritionist's; review with the rest of the plan rules.
- **Free vs Premium:** free sees days logged and average calories; the rest is Premium (gold card → paywall), per LAUNCH_CHECKLIST.

## Dish numbers by recipe calculation (2026-11-01)

No Myanmar dish table can be used commercially ([reports/Dish data plan.md](../reports/Dish%20data%20plan.md)). So each dish gets a standard recipe, and `scripts/catalogue/` calculates its nutrition from an ingredient table ([CATALOGUE.md](CATALOGUE.md)).
- **USDA SR Legacy (CC0) is the ingredient source**, filled in from the CSV download rather than the API, so there's no key and no rate limit. Thai, ASEAN and FAO values are non-commercial, so we don't use them without a licence.
- **Recipes hold grams, never nutrition numbers.** An LLM may draft a recipe, but the numbers come only from the ingredients, because LLMs are weakest at kcal for mixed and local dishes.
- **Placeholder ingredients** (no source yet) are allowed but flagged, and block `reviewed`.
- **Components** (`_` prefix) are shared parts, such as broths, fried beans and dough. They let one reviewed base serve many dishes.
- **Scripts run as plain Node TypeScript** (`node file.ts`, with `allowImportingTsExtensions` in tsconfig and `"type": "module"` in `scripts/catalogue/package.json`), so there's no new dependency. Jest checks the generated files are current, like the catalogue seed.
- **Wired in:** `mocks/dishes.ts` takes unit and numbers from `catalogue/calculated.json` (`fromRecipe`); it keeps names, aliases, flags and photos. A missing dish is a type error.
- **Three tiers on Result:** *Verified* (reviewed), *Calculated* (recipe, not reviewed), *Estimate* (anything else, e.g. a server dish with no recipe). A meal takes its weakest dish's tier (`numbersTier`). The server marks calculated dishes with `source = 'recipe'`.
- **Sugar and sodium** are stored per dish (in the phone's JSON row, plus server columns `sugar_g` and `sodium_mg`), but not per logged item yet. No screen shows them; they're for the blood-sugar and salt features.
- **Catalogue version 2** re-seeds phones with the new numbers. A local server seeded earlier keeps the old ones (the seed never overwrites), so run `npm run db:reset`.
- **Gourd fritter is now logged per piece** (it was per spoon).
- **Review sheets are CSV with a BOM** so the nutritionist can work in Google Sheets or Excel, with Burmese intact.

## Tests for domain logic only (for now)

Jest with the `jest-expo` preset covers `domain/` (plan maths, BMI cut-offs, meal parsing, search). UI is checked on the emulator. Component tests can come once screens stop changing. Note: TypeScript 6 no longer loads global types automatically, so `tsconfig.json` lists `"types": ["jest"]`.

## Copy review

All Burmese strings in `src/i18n/locales/my.ts` need native-speaker review. New strings not on the canvas (please check first):
Batch 9 (dish numbers): `result.calculated` (တွက်ထားတယ်), the badge for recipe-calculated numbers.
Batch 8 (weekly report): every `report.*` string — title အပတ်စဉ် အစီရင်ခံစာ, the six tips (e.g. ညစာမှာ ထမင်း နည်းနည်း လျှော့မယ်, ထမင်းနပ် မလွတ်စေနဲ့), and the notification (အပတ်စဉ် အစီရင်ခံစာ ရပြီ / ပြီးခဲ့တဲ့ အပတ် ဘယ်လိုလဲ ကြည့်မယ်).
Batch 7 (paywall): `paywall.perMonth` (တစ်လ ≈ {{price}} ကျပ်).
Batch 6 (week strip): `home.dayOnTarget` (ကယ်လိုရီ ကိုက်, screen readers only).
Batch 5 (Google sign-in): `signIn.google` (Google နဲ့ ဝင်မယ်), `signIn.or` (ဒါမှမဟုတ်), `signIn.errorGoogle` (Google နဲ့ ဝင်လို့ မရဘူး), `settings.account` (အကောင့်).
Batch 4 (milestones): every `milestones.*` string — screen title ဆုတံဆိပ်, the 25 badge names (e.g. မီးပွား စပြီ, လပြည့်, သင်္ကြန်မှ သင်္ကြန်, လက်ဖက်ရည်ဆိုင် ဖောက်သည်) and their rules.
Batch 3 (backend): `signIn.errorSend` (ကုဒ် ပို့လို့ မရဘူး), `signIn.errorCode` (ကုဒ် မှားနေတယ်), `signIn.offline` (အင်တာနက် မရှိဘူး), `settings.phone` / `signIn` / `deleteAccount` / `deleteTitle` / `deleteConfirm` / `deleteFailed`, `common.retry` (ပြန်စမ်းမယ်).
Batch 2 adds (not on the canvas): `target.reachBy` ({{date}} ဆို ရောက်မယ်), `signIn.codeTitle/resend/verify`, `result.analyzing/verified/estimate/oil*`, `shared.addMore`, `textLog.*` (incl. the sample sentence), `search.empty`, `queue.*`, `home.caloriesOver` (ကယ်လိုရီ ကျော်), the `units.*` classifiers (ပန်းကန် / ပွဲ / ဇွန်း / ခု / ခွက်), and Burmese month names in `lib/format.ts`.
Batch 1: `welcome.signIn` was on canvas; new ones: `camera.permissionTitle`, `camera.permissionAllow`, `progress.bmiUnder/Normal/Over/Obese` (အလေးချိန် နည်း / ပုံမှန် / အလေးချိန် များ / အဝလွန်), `paywall.bestValue` (ပိုတန်တယ်), `settings.sectionGoals/Daily/App`, `common.close` (ပိတ်မယ်), `home.today`.

## Open

- Food data source and the ~260 kcal per rice-plate constant (`domain/nutrition.ts`, marked PLACEHOLDER).
- Pass prices: MOCK 4,900 Ks (1 month) and 12,900 Ks (3 months) in `config/pricing.ts`, shown with "≈ 4,300 Ks a month" on the 3-month pass; not decided.
- Payments: KBZPay/WavePay vs Google Play Billing — check Play policy before building.
- Vision model and effort for the scan Edge Function (default `claude-opus-5-5`, low effort; decide with ~100 labelled photos).
- SMS provider (or Send SMS hook to a Myanmar gateway) for +95 OTP.
- CAPTCHA on anonymous sign-in before launch (each new install gets 3 free scans a day).
- Burmese speech-to-text provider for voice logging (on-device vs cloud).
- Plan rules in `domain/plan.ts` (protein g/kg, fat share, deficit caps, rice-cut steps) — nutritionist review.
- Oil and sweetness multipliers in `domain/meal.ts` — per-dish values from the nutritionist.
