# Sar AI

Calorie-tracking app for Myanmar (Android first, cheap phones, Burmese + English).
Read these before changing anything:

- `docs/PRODUCT_BRIEF.md` — what we're building and why (handoff).
- `docs/ARCHITECTURE.md` — stack, folders, theming, typography, i18n, data flow.
- `docs/DECISIONS.md` — decision log. **Add an entry when you make a non-obvious choice.**
- `docs/OFFLINE.md` — on-phone database (source of truth), sync-ready rules, how sync works.
- `docs/BACKEND.md` — Supabase backend: schema, sync, scan function, running locally, deploying, what's left.
- `docs/USER_FLOWS.md` — how people use the app; known gaps.
- Design canvas (22 screens): https://claude.ai/artifact/DYDw9tRFavDJruN3XiGX6M

## Project rules

- Routes in `src/app/` only re-export screens from `src/features/<area>/`.
- Render text with `<Text variant="…">` from `@/ui` — never react-native `Text` directly — so Burmese/English metrics apply.
- No hex codes outside `src/theme/palette.ts`. Use semantic tokens via `makeStyles(({ theme, type }) => …)`.
- Follow docs/ARCHITECTURE.md → "Design rules": filled = rounded (radius tokens), no borders on cards/options, selected = solid ink, colour only on nutrient indicators, shadows only on the + button and sheets, one gutter (`theme.gutter`), press feedback from `theme.opacity`.
- Android: a rounded view whose fill/border changes with state needs `backgroundColor` and `borderWidth` in its base style (see "Android rounding gotcha").
- Every user-facing string goes in `src/i18n/locales/en.ts` **and** `my.ts` (tsc fails if `my.ts` is missing a key). Burmese copy: spoken register ("…မယ်"), ≥ 13px, one short headline per screen, no helper paragraphs.
- Numbers through `lib/format.ts` (`formatNumber`, `formatPlates`).
- Icon-only buttons need `accessibilityLabel`; touch targets ≥ 44px.
- Nutrition numbers in `src/mocks/` are illustrative; never present them as verified.
- Check layouts at 360 dp wide in **both** languages.
- Before calling work done: `npm run typecheck`, `npm run lint`, `npm test` (the `expo lint` wrapper currently fails on the ESLint version check).
- Data the user creates goes through `src/db/` (SQLite) first, following the sync-ready rules in docs/OFFLINE.md (phone-made UUIDs, `updated_at`, `deleted_at`, `outbox`). Schema changes = a new entry in `MIGRATIONS`.
- Server changes = a **new** file in `supabase/migrations/` (never edit a deployed one), row-level security on every table, then `npm run db:types`. A synced field also needs `src/sync/mapping.ts` (+ its test). Only the server grants scans or Premium.
- The app must keep working without a backend (`backendEnabled` false → prototype mocks) and offline.
- Touching `supabase/`: also run `npm run test:db` (local stack running) and `npm run check:functions`.
- Mocks (scan, STT, OTP, payments, dish numbers) are listed in docs/ARCHITECTURE.md → "Mocked vs real"; keep that table current.

---

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
