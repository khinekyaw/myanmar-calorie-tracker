# Sar AI — App architecture

Status: **all 22 canvas screens built, offline-first** (meals, photo queue and weights in on-phone SQLite; see [OFFLINE.md](OFFLINE.md)), with a **Supabase backend** for sync, accounts, photo scan and account deletion, built and tested locally but not deployed ([BACKEND.md](BACKEND.md)). Builds without `EXPO_PUBLIC_SUPABASE_*` run on the prototype mocks. Speech-to-text, payments and Google sign-in are still mocked. See [Mocked vs real](#mocked-vs-real).

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | **Expo SDK 58** (React Native 0.88, New Architecture, React 19.3, React Compiler on) | One TypeScript codebase for Android now, iOS later; best agent tooling. |
| Routing | **expo-router** (file-based, typed routes) | Official; deep links for free. |
| Styling | `StyleSheet` + our own theme (`makeStyles`) | No styling dependency; tokens in one place; re-flows when language changes. |
| i18n | **i18next + react-i18next**, `expo-localization` | Typed keys, plurals, interpolation; Expo's documented option. |
| State | **zustand** (+ `persist` on `expo-sqlite/kv-store`) | Tiny; synchronous hydrate so language is known before first paint. |
| Fonts | `@expo-google-fonts/inter` + `@expo-google-fonts/noto-sans-myanmar` | One family name per weight (Android needs this). |
| Images | **expo-image** | Disk cache, fast decode, placeholders. |
| Icons | Own SVG set (`src/ui/icons/Icon.tsx`, react-native-svg) | Matches the design; swap to a library by changing one file. |
| Charts | Own SVG (`LineChart`, `Ring`) | No chart library on cheap phones. |
| Camera | **expo-camera**, expo-image-picker | Photo capture + gallery. |
| Backend | **Supabase** (`@supabase/supabase-js`): anonymous + phone OTP auth, Postgres with row-level security, Storage, Edge Functions (Deno) | AI key stays server-side; everything is migrations and functions in `supabase/` ([BACKEND.md](BACKEND.md)). |
| AI scan | **Claude** (vision, structured JSON output) in the `scan` Edge Function | Identifies dishes from the catalogue; nutrition comes from our `dishes` table. |
| Local DB | **expo-sqlite** | Source of truth: meals, photo queue, weights, dish catalogue, sync outbox ([OFFLINE.md](OFFLINE.md)). |
| Files | **expo-file-system** | Meal photos kept in app documents (not cache). |
| Network | **expo-network** | Online / Wi-Fi state for the offline photo queue. |
| Photo compression | **expo-image-manipulator** | 800 px long edge, JPEG 0.7, before queueing. |
| Notifications | **expo-notifications** | Reminder permission (scheduling comes later). |
| Tests | **Jest** (`jest-expo` preset) | Pure domain logic: plan maths, meal parsing, search. |

## Folder layout

```
src/
  app/                 Routes only. Each file re-exports a screen from features/.
    _layout.tsx        Root: fonts, i18n init, ThemeProvider, root Stack + modal routes
    index.tsx          Redirects to /welcome or /home (onboarding state)
    (onboarding)/      welcome → about-you → workday → goal → target-weight → eating
                       → notifications → generating → plan-ready → sign-in
    (tabs)/            home, progress, settings  — headless tabs + custom bar
    add.tsx            Add sheet (transparent modal)
    camera.tsx         Full-screen camera (fullScreenModal)
    result.tsx         Scan result / meal detail (?id=)
    pick-dish.tsx      Low-confidence picker (?id=)
    shared-meal.tsx    ဝိုင်းစား editor (?id=)
    text-log.tsx       Voice / text logging (?id= to fix a scan)
    search.tsx         Food search (?addTo= to add to a meal)
    log-weight.tsx     Log weight (modal; waist hidden for now)
    edit-goal.tsx      Change goal, target, pace
    health.tsx         Health conditions + body details
    paywall.tsx        Prepaid passes (modal)
  features/<area>/     Screens + their private components, grouped by product area
    onboarding/ home/ logging/ progress/ settings/ premium/ navigation/
  ui/                  Reusable design-system components (Text, Button, OptionCard, …)
  theme/               palette.ts → themes.ts → typography.ts → ThemeProvider.tsx
  i18n/                languages.ts, locales/en.ts (source of truth), locales/my.ts
  store/               zustand stores: settings, onboarding (= profile), plan (+ refreshPlan),
                       log (meals, per-day summary, streak), weights (weight/waist history), scanQuota
  domain/              Pure logic, unit-tested in domain/__tests__ (no React):
                         nutrition.ts (BMR, BMI), plan.ts (daily targets, rice cut),
                         meal.ts (macros incl. oil & sweetness), search.ts, parseMeal.ts,
                         progress.ts (goal %, axis ticks), streak.ts
  services/            Outside-world calls: supabase.ts (client), auth.ts (anonymous / phone sign-in,
                       delete account), scan.ts (upload + scan function; MOCK without a backend),
                       database.types.ts (generated: npm run db:types)
  sync/                Sync engine (push/pull, scheduling), profile watcher, account deletion,
                       mapping.ts (phone rows ↔ server rows, lb ↔ kg; unit-tested)
  db/                  On-phone database: schema + migrations, food logs, weights, dishes, photos,
                       first-launch init, outbox and sync reads/writes (see OFFLINE.md)
  lib/                 Small helpers: storage, format, dates, haptics, network
  config/              Business config (pass prices, payment providers)
  mocks/               Placeholder dishes, bundled photos, first-launch sample data — replace before launch
```

Rules:
- `src/app/` holds **routes only**. Screens live in `src/features/`.
- Screens import design-system pieces from `@/ui`, never raw `Text`/hex colours.
- `domain/` stays pure so plan calculation and BMI can be unit-tested.

## Theming

Three layers, so a rebrand touches as few files as possible:

1. **`theme/palette.ts`** — raw hex values. The only file with hex codes.
2. **`theme/themes.ts`** — semantic tokens: `colors.surface`, `colors.textMuted`, `colors.nutrient.carbs`, `radius.lg`, `space.md`, `size.button`, `shadow.floating`. Add `darkTheme` here later; `ThemeProvider` picks by name.
3. **`theme/typography.ts`** — the type scale (`variants`) and per-language font settings (`scripts`).

Components get styles with `makeStyles`:

```tsx
const useStyles = makeStyles(({ theme, type, language }) => ({
  title: { ...type.title, color: theme.colors.text },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl },
}));
```

Styles are memoised and rebuilt only when the theme or language changes.

**To change…**
- a colour → `palette.ts` (or point a semantic token at another palette colour in `themes.ts`)
- corner radius / spacing / button height → `themes.ts` (`radius`, `space`, `size`)
- fonts → `fontFamilies` in `typography.ts` + the `useFonts` list in `app/_layout.tsx`
- type sizes → `variants` in `typography.ts`

## Design rules (apply on every screen)

| Rule | How it's enforced |
|---|---|
| **Everything with a fill is rounded.** Cards 20–24 (`radius.lg`/`xl`), options and tiles 16 (`radius.md`), small wells 12 (`radius.sm`), buttons/chips/segments pills. | Use the tokens; raw numbers only for circles (`size / 2`) and dots. |
| **No borders on cards or options.** Separation comes from fill: grey `surface` on white, white on grey. Hairlines only divide list rows (Settings, SharedMeal) and the tab bar. | `Card`, `OptionCard`, `Chip` have no border variants. |
| **Selected = solid ink with white text**; unselected = `surface` grey. Same for options, chips, segments, days. Exception: Premium uses light gold (`accentSoft`) for its surfaces and the selected pass, with a gold check. | `selected` / `onSelected` tokens. |
| **Primary is brand black `#111217`** for nearly everything. **Accent is brand gold `#DEA84A`**, used sparingly: Premium (gold logo in Settings and on the paywall, "Best value"), the plan-ready check, and the logo for Premium members only. Gold is never text on white (2:1) and never near nutrient indicators. | `colors.primary`, `colors.accent` / `onAccent` / `accentSoft`. |
| **Colour only on nutrient indicators** (rice amber + plate, protein coral + drumstick, fat violet + oil bottle), the BMI scale, the animated streak fire and earned badge art. | `colors.nutrient`, `colors.bmi`, `colors.streak` (`ui/StreakFlame.tsx`); badge art lives in `assets/badges/`. |
| **Shadows only** on the floating + button, bottom sheets and floating chips. | `shadow.*` tokens. |
| **Press feedback:** grey options darken to `surfaceStrong`; everything else fades to `opacity.pressed` (0.7). Disabled = `opacity.disabled` (0.35). | `theme.opacity`. |
| **One page gutter** (`theme.gutter`, 16) on every screen. | `Screen`, tab screens, `PhotoSheet`, `AddSheet`. |
| **Pill labels use `Badge`** (min height 28, 12 px sides, 3 px top/bottom), which is roomy enough for Burmese. No hand-made pills. | `ui/Badge.tsx`. |
| **Body measurements** are typed or picked on a ruler; ± steppers are only for counts (portions, spoons, plates). | `MeasureInput` / `RulerPicker` vs `Stepper`. |
| **Nothing jumps while values change.** Numbers use equal-width digits (`tabular-nums` on every number style); weights always show one decimal ("150.0"); lines that can be empty keep their space (rendered invisible, e.g. `ReachByLine`). | `typography.ts`, `formatFixed`, `ReachByLine`. |
| **No raw colours** outside `palette.ts`, including translucent overlays (`onInkSubtle`, `photo.*`, `camera.controlActive`). | grep for `rgba(` / `#` outside `src/theme/`. |

### Android rounding gotcha

On Android (RN 0.88, Fabric) a view only clips its background and border to `borderRadius` if it **had a background (and the same border width) when it first rendered**. A view that gains a background later (an expanded search row, a newly selected day) draws square corners.

Changing an existing fill's colour (grey → ink) is fine. What breaks is a view that had **no visible fill** at mount. A transparent base background does not help; a constant border does. Two fixes, in order of preference:

1. **Remount on state change** with a `key` (`key={isOpen ? 'open' : 'closed'}`), so the view always mounts with its final fill. Used by `FoodSearchScreen` rows and `Segmented` items.
2. **Keep the border width constant** and change only colours (`borderColor: 'transparent'` when off). Used by `WeekStrip` days and `SignInScreen` code boxes.

Always check a new state change on the Android emulator after a cold start.

## Brand

- Logo source: `assets/images/logo.svg`. In the app: `<Logo />` (`src/ui/Logo.tsx`, react-native-svg, `size` and `color` props). Shown with the "Sar AI" wordmark on Welcome and Home, and in the reminder preview.
- App icons are generated from the logo: `icon.png` (1024, white), Android adaptive `android-icon-foreground/monochrome.png` (logo inside the safe circle) on a white `android-icon-background.png`, `splash-icon.png`, `favicon.png`. After changing them run `npx expo prebuild -p android`, then `npx expo run:android`.

## Burmese vs English typography

Burmese script stacks vowels and medials above and below the base line, so it needs much more line height than Latin, and its words run longer. `typography.ts` keeps a separate `ScriptSpec` per language:

| | English | Burmese |
|---|---|---|
| Font | Inter | Noto Sans Myanmar |
| Line height | 1.35× (titles 1.2×) | 1.7× (titles 1.55×) |
| Letter spacing | from variant (tight on headlines) | none |
| Min size | 11 | **13** (design rule) |
| Overrides | — | display 26, title 24, headline 18 |

Numbers and the "Sar AI" wordmark use `role: 'latin'` variants (`numberXl`, `numberMd`, `wordmark`…) and always render in Inter with tight line height, so "1,085" looks identical in both languages.

**Mixed scripts:** `<Text>` checks plain-string children. Burmese text inside the English UI (e.g. "မြန်မာ" in the language switcher) gets the Burmese metrics, and Latin-only strings inside the Burmese UI ("Premium", "KBZPay", "Wi-Fi") get Inter. Strings that mix both scripts ("[PRICE] ကျပ်") follow the current language.

Tune per language in `scripts.my` / `scripts.en`: `lineHeight`, `sizeScale`, `minSize`, and per-variant `overrides`. Always use `<Text variant="…">` so these apply automatically.

## Localisation

- `i18n/locales/en.ts` is the **source of truth** for keys. `my.ts` is typed as `Translations`, so a missing or extra key fails `tsc`.
- `t()` keys are type-checked (`i18n/i18next.d.ts`).
- Language lives in the settings store (persisted). i18next follows it. Default for new installs: **Burmese** (`DEFAULT_LANGUAGE`).
- Switch from Welcome (top-right toggle) or Settings → Language. Switching re-renders all text with the other script's metrics instantly.
- Numbers go through `lib/format.ts` (`formatNumber`, `formatPlates` → "2½"). Flip `NUMERALS.my` to `'myanmar'` to show ၀–၉ digits everywhere.
- Dish names are **data**, not translations: each dish has `name: { my, en }` (later `name_my`, `name_en`, aliases from the database).
- Adding a language: add to `LANGUAGES`, add `locales/<code>.ts`, add a `scripts.<code>` entry, add to `supportedLocales` in `app.json`.

## Screen map

| # | Canvas file | Route | Screen |
|---|---|---|---|
| 01 | Main | `/welcome` | `features/onboarding/WelcomeScreen.tsx` |
| 02 | AboutYou | `/about-you` | `features/onboarding/AboutYouScreen.tsx` |
| 03 | Workday | `/workday` | `features/onboarding/WorkdayScreen.tsx` |
| 04 | Goal | `/goal` | `features/onboarding/GoalScreen.tsx` |
| 05 | TargetWeight | `/target-weight` | `features/onboarding/TargetWeightScreen.tsx` (skipped for "maintain") |
| 06 | EatingHabits | `/eating` | `features/onboarding/EatingHabitsScreen.tsx` |
| 07 | Notifications | `/notifications` | `features/onboarding/NotificationsScreen.tsx` |
| 08 | Generating | `/generating` | `features/onboarding/GeneratingScreen.tsx` (computes the plan) |
| 09 | PlanReady | `/plan-ready` | `features/onboarding/PlanReadyScreen.tsx` |
| 10 | SignIn | `/sign-in` | `features/onboarding/SignInScreen.tsx` (phone → code step) |
| 11 | Home | `/home` | `features/home/HomeScreen.tsx` |
| 12 | AddSheet | `/add` | `features/logging/AddSheet.tsx` |
| 13 | Camera | `/camera` | `features/logging/CameraScreen.tsx` |
| 14 | Result | `/result?id=` | `features/logging/ResultScreen.tsx` |
| 15 | SharedMeal | `/shared-meal?id=` | `features/logging/SharedMealScreen.tsx` |
| 16 | PickDish | `/pick-dish?id=` | `features/logging/PickDishScreen.tsx` |
| 17 | TextLog | `/text-log` | `features/logging/TextLogScreen.tsx` |
| 18 | FoodSearch | `/search` | `features/logging/FoodSearchScreen.tsx` |
| 19 | Analyzing | (state of Home) | offline badge in `HomeScreen`, queued card in `home/components/MealRow.tsx` |
| 20 | Progress | `/progress` | `features/progress/ProgressScreen.tsx` |
| 21 | Settings | `/settings` | `features/settings/SettingsScreen.tsx` |
| 22 | Paywall | `/paywall` | `features/premium/PaywallScreen.tsx` |
| + | (new) Log weight | `/log-weight` | `features/progress/LogWeightScreen.tsx` |
| + | (new) Edit goal | `/edit-goal` | `features/progress/EditGoalScreen.tsx` |
| + | (new) Health | `/health` | `features/settings/HealthScreen.tsx` |
| + | (new) Milestones | `/milestones` | `features/milestones/MilestonesScreen.tsx` (from the streak pill; badges in [BADGES.md](BADGES.md)) |

How people move through these screens: [USER_FLOWS.md](USER_FLOWS.md).

## Navigation

- Root `Stack` (`app/_layout.tsx`) with modal routes: `add` (transparent modal, fades), `camera` (full-screen), `paywall` (modal). Logging screens (`result`, `pick-dish`, `shared-meal`, `text-log`, `search`) are plain stack screens; they return Home with `router.dismissTo('/home')`.
- Scan flow: Camera → (online) `result` shows a loading state → when the answer arrives it `replace`s to `shared-meal` if `shared_table`, or `pick-dish` if confidence < 0.6 (`CONFIDENCE_THRESHOLD`). Offline: Camera → Home with the photo queued.
- Tabs use **expo-router headless tabs** (`expo-router/ui`) with our own bar (`features/navigation/TabBar.tsx`): icons only + floating + button.
- `app/index.tsx` redirects by `useOnboarding().completed`.

## Log entries and the photo queue

Everything the user logs is a `LogEntry` (`store/log.ts`, mirrors `food_logs` + `log_items`):

```
LogEntry { id, eatenAt, source: photo|voice|text|search|quick,
           status: queued|analyzing|done, items: MealItem[], photoUri?,
           isSharedMeal?, confidence?, candidates? }
MealItem { dishId, qty, oil?: less|normal|more, sweetness?: choSeint|pawSeint|kyaSeint|pawKya }
```

- Nutrition is never stored on the entry; it's computed from the dish table (`domain/meal.ts → itemMacros/sumMacros`), so verified numbers from the nutritionist apply everywhere at once.
- `useScanQueue()` (mounted once in the root layout) sends every `queued` photo when `useConnectivity().canUpload` is true — online, and on Wi-Fi if "Wi-Fi only" is on. Settings → Developer → "Simulate offline" forces offline in dev builds.
- `confidence: 1` marks an entry the user has confirmed (PickDish, SharedMeal Save), so it doesn't re-route again.
- Entries are saved in SQLite first (`src/db/foodLogs.ts`) and queued in `outbox` for sync; the store is an in-memory view.

## Mocked vs real

| Area | Prototype | Real version |
|---|---|---|
| Photo scan | **Real** with a backend: upload to `meal-photos` + `scan` Edge Function → Claude. Without one: `services/scan.ts` cycles 3 demo answers. Not yet run against the real model (no API key here) | Model/effort chosen with ~100 labelled photos |
| Dish data | `mocks/dishes.ts` seeds the phone and the server (`supabase/seeds/catalogue.sql`); illustrative numbers, 15 dishes, **none verified** on the server | Verified `dishes` table (200–300) from the nutritionist |
| Food photos | Wikimedia Commons images bundled in the app (`assets/images/dishes/`) | Our own photos (bundled + `dish-photos` bucket) |
| Speech-to-text | Mic fills a sample sentence | Burmese STT provider (open decision); parser stays the same |
| Phone OTP | **Real** with a backend (Supabase phone auth; local test numbers). Without one: any 6-digit code | SMS provider / gateway for +95 |
| Google sign-in | Real with a backend (Supabase Google OAuth in a browser sheet, `services/auth.ts`); MOCK (goes straight in) without one | Google Cloud OAuth client (id + secret in Supabase) |
| Free-scan quota | **Real**: server `scan_quota`, mirrored on the phone for the counter | — |
| Pass prices | MOCK: 4,900 Ks / 12,900 Ks (`config/pricing.ts`) | Decided prices (and per-provider fees) |
| Payments | Pay buttons activate a **local mock** pass (`store/premium.ts`); the server ignores it | KBZPay / WavePay or Play Billing → webhook → `grant_pass` (server `passes` already read by the app) |
| Reminders | Permission request only | Scheduled local notifications |
| Log storage | SQLite on the phone, synced to Supabase; sample history in development builds only | — |
| Weight history | SQLite `weights`, synced (kg on the server); sample data in development builds only | — |
| Sync | **Real**: push/pull engine ([OFFLINE.md](OFFLINE.md#how-sync-works)) | — |
| Account deletion | **Real**: Settings → Delete account (`delete-account` function) | — |

## Data flow (details in [BACKEND.md](BACKEND.md))

```
Camera ─► compress (~800px, expo-image-manipulator) ─► SQLite queue (status: queued)
                                                          │  online (and Wi-Fi if "Wi-Fi only")
                                                          ▼
                     Storage upload (meal-photos/<user>/<log>.jpg) ─► Edge Function "scan" ─► Claude
                     free scan used atomically · catalogue in cached prompt │ JSON per AI scan contract
                                                          ▼
          dish ids checked against `dishes` ─► Result / SharedMeal / PickDish ─► food_logs + log_items (SQLite)
                                                                                      │ outbox
                                                                                      ▼
                                                              sync_push / sync_pull ⇄ Supabase Postgres
```

- Text / voice / search logging works fully offline against the local dish cache in SQLite.
- Search index: normalise Zawgyi → Unicode, then match Burmese, romanized aliases and fuzzy spellings (SQLite FTS locally, `pg_trgm` server-side).
- Scan quota is enforced server-side (`scan_quota`), mirrored locally for the counter.

## Running

```bash
npx expo start            # Metro
npx expo run:android      # build + install the dev app on an emulator/device
npm run typecheck         # tsc --noEmit
npm run lint              # eslint src
npm test                  # jest (domain logic, sync mapping, scan contract)
npm run test:db           # pgTAP database tests (local Supabase running)
npm run check:functions   # type-check Edge Functions (Deno)
```

Backend locally: [BACKEND.md → Running locally](BACKEND.md#running-locally).

Expo Go isn't used: it lags SDK releases, and production fonts and native modules need a dev build anyway.
