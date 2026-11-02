# Sar AI — Before launch

What has to happen before Sar AI goes on the Play Store, as of 2026-10-31. Tick items as they land.

**Priority:** **Must** = blocks launch · **Should** = do before or right after launch · **Later** = after launch.
**Owner:** **You** = needs your accounts, money or decisions · **Claude** = code or config work · **Team** = nutritionist, translator, designer.

Already done: offline-first app with on-phone SQLite; Supabase schema with row-level security on every table (54 database tests); sync across phones; phone sign-in; Google sign-in code; server-side free-scan quota; account deletion; milestones and badges; Burmese and English UI.

---

## 1. Accounts and services to set up

- [ ] **Must · You** — Supabase **staging** and **production** projects (Singapore region). Then Claude pushes migrations, loads the dish catalogue, sets secrets and deploys functions ([BACKEND.md → Deploying](BACKEND.md#deploying-staging-then-production)).
- [ ] **Must · You** — **Anthropic API key** for photo scans. Set a monthly spend limit in the Anthropic console.
- [ ] **Must · You** — **SMS provider** that delivers codes to +95 numbers (or a Myanmar SMS gateway through Supabase's Send SMS hook). Test on MPT, ATOM, U9 and Mytel.
- [ ] **Must · You** — **Google Cloud OAuth client** (Web application) and the OAuth consent screen with app name, logo, privacy policy link and support email. Google reviews the consent screen before strangers can sign in.
- [ ] **Must · You** — **Payments**: choose KBZPay / WavePay merchant accounts or Google Play Billing (check Play's policy on outside payments first), then set the real pass prices. The current prices are mock.
- [ ] **Must · You** — **Google Play developer account** and an **Expo (EAS) account**.
- [ ] **Must · You** — A **website / domain** for the privacy policy, terms, account-deletion page and a support email.
- [ ] **Should · You** — **Trademark and Play Store name check** for "Sar AI" (noted on the design canvas).
- [ ] **Should · You** — **Sentry** (or similar) account for crash reports.

## 2. Security and privacy

- [ ] **Must · Claude** — **CAPTCHA on anonymous sign-ins** (Cloudflare Turnstile or hCaptcha). Every new install gets 3 free scans a day for a week, so scripted installs could burn the AI budget. Needs your CAPTCHA keys.
- [ ] **Must · You + Claude** — Set `SCAN_DAILY_BUDGET_USD` on the scan function and an alert on `scans.cost_usd`, so a spike stops scanning instead of draining money.
- [ ] **Must · Claude** — **Auth rate limits** in production: SMS per hour, OTP verify attempts, anonymous sign-ins. Myanmar mobile users share IP addresses, so limits per IP must not lock out a whole network.
- [ ] **Must · Claude** — **Turn off email sign-up** in production. The app doesn't use email, but `[auth.email] enable_signup` is on by default.
- [ ] **Must · Claude** — Keep **phone confirmations** and **manual linking** on in the dashboard (already in `supabase/config.toml`). Run Supabase's **Security Advisor** on staging and fix what it flags.
- [ ] **Must · Claude** — **Payment webhook**: verify the provider's signature, make it idempotent, and grant passes only through the server `grant_pass`. The app's local mock pass must not ship.
- [ ] **Must · Claude** — Release builds must not include development-only things: sample data, the Developer section in Settings, and the local `.env.local` server address. These are already behind `__DEV__`; confirm on a release build. Production keys go in EAS environment variables, and only the publishable key ever ships in the app.
- [ ] **Must · You** — **Privacy policy** covering health data stored in Singapore, meal photos kept until the account is deleted, the phone number or Google email, and Supabase and Anthropic as processors. Link it in the app and the Play listing.
- [ ] **Must · You + Claude** — **Account-deletion web page.** Play requires a link to ask for deletion outside the app; the in-app button already exists.
- [ ] **Must · You** — **"Not medical advice"** note for the blood sugar / pressure features (in onboarding and the paywall) and in the terms.
- [ ] **Should · Claude** — **Encrypt the sign-in token** (move the Supabase session to `expo-secure-store`). It's in the app's SQLite now: private to the app, but not encrypted.
- [ ] **Should · Claude** — Decide on **Android backups** (`allowBackup`): backups would include meals and weights. Either turn them off or say so in the privacy policy.
- [ ] **Should · Claude** — **Photo retention**: delete meal photos after, say, 90 days and keep only the logged dishes. Less health data stored, and lower storage cost.
- [ ] **Should · Claude** — `npm audit` and dependency updates. The last install reported known vulnerabilities in dev tools; check which reach the app.
- [ ] **Should · Claude** — Make sure release builds allow **HTTPS only** (no cleartext HTTP, which local development uses).

## 3. Performance on cheap phones

Target: 2–3 GB RAM, Android 9 or later, slow 3G/4G.

- [ ] **Must · Claude** — **Release build size**: publish an App Bundle (per-device downloads) and turn on code shrinking (`expo-build-properties`: R8 minify and resource shrinking), then test that nothing breaks. The debug APK is 90 MB; aim for a 30–40 MB download.
- [ ] **Must · You + Claude** — **Test on a real low-end phone** (2 GB RAM) on a Myanmar network: cold start time, scrolling Home and Milestones, the camera, the photo queue on slow data.
- [ ] **Should · Claude** — **Cold start**: measure it, then trim anything slow (8 font files, opening the database, first sync).
- [ ] **Should · Claude** — **Progress chart with a year of data**: thin out the points so drawing and finger-tracking stay smooth.
- [ ] **Should · Claude** — **Badge art**: 25 SVGs (1 MB). If Milestones stutters on a cheap phone, switch the heaviest (laphet, firstScan, mohinga) to WebP.
- [ ] **Should · Claude** — **Animations** (streak fire, diamond coin) run on the UI thread and stop when "remove animations" is on. Check them on a low-end phone.
- [ ] **Later · Claude** — First sync of a long history on a new phone: it's paged already; measure on slow data.

## 4. Other setup (build and release)

- [ ] **Must · Claude** — **EAS setup**: `eas.json` with development, preview and production profiles, environment variables per profile, and Play App Signing.
- [ ] **Must · You + Claude** — **Play Console listing** in Burmese and English: screenshots, feature graphic, description, category Health & Fitness, content rating, target audience (adults, not children), the **Data safety** form (health info, photos, phone or email), the **Health apps declaration**, and the privacy and deletion links.
- [ ] **Must · Claude** — **Reminders**: schedule the "ထမင်းစားပြီးပြီလား?" notifications. Today the app only asks for permission.
- [ ] **Should · You + Claude** — **Over-the-air updates** (`expo-updates`, with a runtime version policy) so text and screen fixes ship without a store review.
- [ ] **Should · Claude** — **Crash reporting** (Sentry) in the app and the Edge Functions.
- [ ] **Should · Claude** — **Staging smoke test** before each release: sign in with a real +95 number and with Google, log a meal, scan a photo, go offline and back, delete the account.
- [ ] **Later · You** — Privacy-friendly analytics, if you need numbers beyond the server tables.

## 5. Content and data

- [ ] **Must · Team** — **Verified dish database**: 200–300 Myanmar dishes with the nutritionist (kcal, carbs, protein, fat; plus sugar and sodium for the health features below). The pipeline for this is built and wired in ([CATALOGUE.md](CATALOGUE.md)): recipes → calculated numbers → review sheets → app and server. There are 151 dishes now, all unreviewed drafts.
- [ ] **Must · Team** — Nutritionist review of the **plan rules** (`domain/plan.ts`), the **rice-plate kcal constant** and the **oil and tea-sweetness multipliers**.
- [ ] **Must · Team** — **Native Burmese review** of all copy (batches 1–7 in [DECISIONS.md → Copy review](DECISIONS.md#copy-review)).
- [ ] **Must · Team** — **Replace the Wikimedia food photos** with Sar AI's own (licence and attribution), and the **Welcome image**, which has English text baked in.
- [ ] **Must · You** — **Confirm the vision model** using about 100 labelled Myanmar meal photos to measure scan accuracy. The default is Claude Haiku 5.5 at low effort (about $0.30 per 1,000 scans; [reports/Scan model choice.md](../reports/Scan%20model%20choice.md)), but it hasn't run against the real model yet. Move to Sonnet 5.5 only if Haiku misses too many.
- [ ] **Should · You** — **Voice logging** uses the phone keyboard's own voice typing (2026-11-01; no cost). Check on 2–3 popular phones that Gboard (or the phone's keyboard) does Burmese voice typing, and that the parser understands what it writes.

## 6. Feature gaps to finish

- [x] **Must · Claude** — When a scan fails, Result stays on *Analyzing…*. Show a clear state with Retry. *Done 2026-11-01: Result says why a photo waits (failed, offline, no free scans, no food found), with Retry or Say or type.*
- [x] **Must · Claude** — When the server says today's free scans are used up (for example, on another phone), tell the user instead of silently waiting. *Done 2026-11-01: the Home card reads "Free scans used up"; Result offers Premium or Say or type.*
- [ ] **Must · You** — **Decide**: are blood sugar / pressure goals (next section) in version 1? Until they're built, the paywall doesn't mention them (hidden 2026-11-01). The weekly report is built.
- [ ] **Should · Claude** — "You earned a badge" moment after logging.
- [ ] **Later · Claude** — Uposatha vegetarian: hidden in Settings for version 1 (2026-11-01). To bring it back, suggest vegetarian dishes first on Uposatha days.
- [ ] **Should · Claude** — Meals restored on another phone show the dish photo, not the meal photo (needs signed photo URLs).
- [ ] **Later · Claude** — kg as well as lb; bring back waist tracking (hidden for now, data kept).

## 7. Testing before release

- [ ] **Must · You + Claude** — Closed test on the Play **internal testing track** with real people on real phones (Burmese UI, 360 dp screens, both languages).
- [ ] **Must · Claude** — Run `npm run test:db` against **staging**, and try to abuse it: reading another user's rows, scanning past the quota, granting a pass from the app.
- [ ] **Must · You + Claude** — Offline / airplane mode, two phones on one account, and account deletion, all on a release build.
- [ ] **Should · Claude** — Accessibility pass with TalkBack (labels and touch targets).

---

## How the Premium features will work

Premium has three planned features; the paywall lists only the two that work (blood sugar / pressure hidden until built). Status today:

| Feature | Today | To build |
|---|---|---|
| **Unlimited photo scans** | Works: the server allows 3 free scans a day in an account's first week, then 1 a day, and lifts the limit with an active pass | Real payments (the pass is mock) |
| **Blood sugar / pressure** | Only a question: onboarding and Settings → Health ask about it and sync it; nothing uses the answer | Everything below |
| **Weekly report** | **Built** (2026-11-01): `/week`, Monday notification, free headline + Premium full report | Health lines (needs the blood sugar / pressure data); share as image |

Everyone keeps answering the health question for free (it shapes the plan). **Premium unlocks the guidance built on it.**

### Blood sugar (diabetes or pre-diabetes)

- **Plan:** a lower carbohydrate share and a stricter rice-plate cut (for example 3 → 2½ → 2 plates), spread across meals. The exact numbers come from the nutritionist.
- **Each meal:** flag sugar-heavy items (sweet milk tea, condensed milk, desserts) on the Result screen and suggest the lighter option, e.g. **ပေါ့စိမ့်** instead of **ချိုစိမ့်** (tea sweetness is already in the app).
- **Home:** a "sugar-heavy meals this week" count, and the rice-plate card turns amber when today goes over.
- **Later:** optional fasting glucose log (mg/dL) with a chart, like weight.
- **Needs:** sugar per dish in the verified dish data.

### Blood pressure

- **Daily sodium budget** (around 2,000 mg, per WHO guidance, confirmed by the nutritionist), shown like the other nutrient cards.
- **Each meal:** flag salty dishes, which are common in Myanmar food: ngapi, fish sauce, dried and salted fish, soup bases.
- **Later:** optional blood pressure log.
- **Needs:** sodium per dish (a new `sodium_mg` field: phone database, server migration and sync mapping).

### Weekly report

Built 2026-11-01 as described below, except the health line (it waits for sugar and sodium data) and sharing. Code: `domain/weekReport.ts` (tested), `features/report/`. Not yet seen firing on a phone: the emulator has notifications denied.

- **When:** every Monday morning (Myanmar time), a notification opens a **Week** screen. Older weeks stay browsable.
- **What:**
  - days logged
  - average calories against the target, and how many days were on target
  - average rice plates, protein and fat
  - weight change
  - streak
  - badges earned
  - top dishes
  - one tip
  - for health users: sugar-heavy or salty days
- **How:** worked out on the phone from meals, weights and the plan, like the badges, so it works offline and needs no new server table.
- **Free users:** see the headline (days logged and average calories); Premium sees the full report.
- **Later:** share the report as an image (Viber, Facebook).

### Order to build

1. ~~Weekly report~~ (built 2026-11-01).
2. Blood sugar (needs sugar values in the dish data).
3. Blood pressure (needs sodium values and a schema change).
4. Payments last, so the pass unlocks real features.
