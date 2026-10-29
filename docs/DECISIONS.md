# Sar AI — Decision log

Newest first. Each entry: what we decided, why, and what would make us revisit it.
Product-level decisions from the handoff are in [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md).

---

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

## Copy review

All Burmese strings in `src/i18n/locales/my.ts` need native-speaker review. New strings not on the canvas (please check first):
`welcome.signIn` was on canvas; new ones: `camera.permissionTitle`, `camera.permissionAllow`, `progress.bmiUnder/Normal/Over/Obese` (အလေးချိန် နည်း / ပုံမှန် / အလေးချိန် များ / အဝလွန်), `paywall.bestValue` (ပိုတန်တယ်), `settings.sectionGoals/Daily/App`, `common.close` (ပိတ်မယ်), `home.today`.

## Open

- Food data source and the ~260 kcal per rice-plate constant (`domain/nutrition.ts`, marked PLACEHOLDER).
- Pass prices (`config/pricing.ts`, `[PRICE]`).
- Payments: KBZPay/WavePay vs Google Play Billing — check Play policy before building.
- Vision model choice for the scan Edge Function.
- SMS provider for +95 OTP.
