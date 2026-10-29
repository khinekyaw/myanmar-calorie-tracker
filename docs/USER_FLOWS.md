# Sar AI — How people use the app

Every journey below was walked on the Android emulator (360 dp, Burmese and English). "→" is a tap. Screens are named as in the [screen map](ARCHITECTURE.md#screen-map).

## 1. First launch (about 2 minutes)

Welcome → **Get started** → About you (sex, birth year, height, weight) → Workday → Goal (+ blood sugar / pressure) → Target weight & pace *(skipped for "Stay the same")* → Where do you eat? → Reminders (*Remind me* asks Android permission, *Not now* skips) → Generating → **Plan ready** (kcal, plates of rice, protein, fat, rice cut 3 → 2½ → 2) → Sign in (phone → code, Google, or *Skip*) → Home.

- The plan is calculated from these answers, and the onboarding weight becomes the first point on the Progress chart.
- *I have an account* on Welcome goes straight to Sign in. With no profile, the app uses a default plan until Settings → Goals / Health are filled in.
- The language switch is on Welcome (and in Settings). Burmese is the default.

## 2. Log a meal (the daily loop)

Home → **+** opens the add sheet:

| Way | Steps | Works offline |
|---|---|---|
| **Photo** | Camera → shutter → Result (or SharedMeal / PickDish, see 3) → *Done* | Queued, sent when back online |
| **Speak** | Mic → say "လက်ဖက်ရည် ပေါ့စိမ့် တစ်ခွက်နဲ့ ပလာတာ တစ်ချပ်" → check the parsed dishes → *Save* | Yes |
| **Search** | Type "laphet yay" / "mohinga" → tap a dish → quantity, tea sweetness → *Add* | Yes |
| **Quick re-log** | Tap a chip (milk tea, palata…) | Yes |
| Barcode | Shown as *Soon* (later scope) | — |

After logging, Home updates the calories left (or *Calories over*), plates of rice, protein, fat and the meal list. Free scans: 3 a day; the counter on the camera opens the paywall, and the 4th shutter press opens it too.

## 3. When the scan isn't sure

- **Shared table** (several curries) → **SharedMeal**: rice in ½-plates, each curry in spoonfuls, soup / ngapi toggles, *+* adds any dish via Search → *Save*.
- **Low confidence** (< 0.6) → **PickDish**: top 3 guesses, the first marked *Closest*; *Something else* opens voice/text logging for that photo.
- **Wrong dish on a confident scan**: Result → *Fix* → PickDish (on a shared meal, *Fix* opens SharedMeal).
- **Oil**: Result → *Oil · Normal* cycles less / normal / more for curries and fried food.

## 4. Fix or remove a meal later

Home → tap any meal → Result: change quantity or oil, *Fix* the dish, or **delete** (bin icon, top right → confirm sheet). Other days: tap a day in the week strip, and Home shows that day's meals and totals.

## 5. Offline

No connection → Home shows *Offline*. Photos are compressed (800 px) and wait as *Waiting* cards, then become *Analyzing…* and a logged meal when the connection returns. With *Send photos on Wi-Fi only*, they wait for Wi-Fi. Voice, search and quick re-log work without a connection. Dev builds: Settings → Developer → *Simulate offline*.

## 6. Track weight and goal

Progress tab:

- **Goal weight** card → *Edit goal* → goal, target, pace, "reach by" date → *Save* (plan recalculated).
- **Current weight** card → *Log weight* → stepper (½ lb), or switch to **Waist** for homes without a scale → *Save* (plan recalculated from the new weight).
- **Goal progress** chart: % of the way to the goal, lb to go, 1M / 3M / All, dashed goal line, tap or drag for any day's value, weight ↔ waist.
- **This week**: calories per day against the target; tap a bar for that day.
- **BMI** (Asian cut-offs 18.5 / 23 / 27.5) from the latest weight and height; *Add height* if missing.
- Streak in the corner: days in a row with a logged meal (a feast day counts).

## 7. Settings

Premium (paywall) · **Goals** (= Edit goal) · **Health** (blood sugar / pressure, sex, birth year, height) · Uposatha vegetarian · Feast day · Reminders · Wi-Fi only · Language. Dev builds also show Simulate offline, Reset free scans, Restart onboarding.

## 8. Premium

Paywall (from the camera counter, the 4th scan, or Settings): 1- or 3-month prepaid pass, KBZPay / WavePay, "No auto-renew". Payments are not connected yet.

---

## Gaps found in this review (2026-10-30)

| Gap | Status |
|---|---|
| No way to log weight or waist | **Fixed**: Progress → Log weight |
| Goal / target / pace couldn't change after onboarding; Settings → Goals did nothing | **Fixed**: Edit goal screen (Progress and Settings) |
| Settings → Health did nothing | **Fixed**: Health screen (conditions + body details) |
| Plan never recalculated after weight or goal changes | **Fixed**: `refreshPlan()` after each save |
| BMI used a fixed sample height | **Fixed**: uses your height; asks for it if missing |
| Week strip day selection changed nothing | **Fixed**: Home shows the selected day |
| A wrongly logged meal couldn't be removed | **Fixed**: delete on Result with confirm sheet |
| Barcode looked usable but opened the normal camera | **Fixed**: marked *Soon*; removed from the camera bar |
| Streak was a fixed number | **Fixed**: counted from logged days (feast day keeps it) |
| Progress chart showed only a line | **Fixed**: axis labels, dates, goal line, values on tap, periods, weekly calories |

## Still open (prototype limits)

- Meals and the plan reset on app restart: meals are in memory, while weight and settings persist. Next step: SQLite.
- Scan, speech-to-text, OTP and payments are mocks (see [Mocked vs real](ARCHITECTURE.md#mocked-vs-real)).
- Uposatha vegetarian has no effect yet (planned: suggest vegetarian dishes first on Uposatha days).
- Queued photos that come back low-confidence are logged with the top guess; they only ask for review when opened.
- Weight is in lb only; kg isn't offered yet.
- The Welcome hero image has "Scanning Meal…" in English baked into the picture.
