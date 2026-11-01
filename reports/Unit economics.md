# Can 4,900 Ks pay for the app?

November 2026. Cost per user against the Premium pass, and what to change on a small budget.

## The short answer

**Yes, a Premium user pays for their own AI many times over.** The pass brings in about **$1.00** after fees. A Premium user scanning 3–5 meals a day costs **$0.05–0.09** in AI (Claude Haiku 5.5).

The money leaks elsewhere, in two places:
1. **Free users' photo scans.** At 1.5 % conversion, 98 of every 100 users never pay, and 3 free scans a day adds up.
2. **SMS sign-in codes.** International SMS to Myanmar costs about **$0.16–0.33 per message** ([sent.dm](https://www.sent.dm/en/resources/sms-pricing/myanmar-sms-pricing)), a fifth to a third of a pass for every phone sign-in.

Fix those two and the app covers its running costs from about 10,000 monthly users. Even then the monthly surplus is only a few hundred dollars: enough to run, not to pay a team. That needs more revenue (see "How others make money").

## The numbers

These are rough figures; every input is an assumption, listed under the table.

| Monthly users | Payers (1.5 %) | Revenue | Costs today | Result today | Costs after changes | Result after changes |
|---|---|---|---|---|---|---|
| 1,000 | 15 | $15 | $60 | **−$45** | $30 | −$15 |
| 10,000 | 150 | $150 | $375 | **−$225** | $71 | **+$79** |
| 50,000 | 750 | $751 | $1,775 | **−$1,024** | $254 | **+$497** |

Where the costs come from at 10,000 users:

| | Today | After changes |
|---|---|---|
| Free users' scans | $142 | $35 |
| Premium users' scans | $8 | $5 |
| SMS codes | $200 | $5 |
| Supabase Pro | $25 | $25 |

**Assumptions:**
- **Revenue:** 4,900 Ks = $1.05 at the street rate of ~4,650 Ks per dollar (we pay our bills in dollars). 5 % is assumed lost to payment fees; KBZPay and WavePay don't publish merchant rates, and Google Play takes 15 %.
- **Conversion:** 1.5 % ([market research](Sar%20AI%20Myanmar%20market%20research.md)).
- **Scan cost:** $0.0006 per scan (Haiku 5.5; [Scan model choice](Scan%20model%20choice.md)), $0.0004 after the photo-size change. Not measured yet.
- **Free scans today:** 0.8 a day per free user on average, with a cap of 3. After the changes: 0.3 a day.
- **SMS:** 10 % of users verify a phone each month. Today that's $0.20 per international SMS; after the change, ~$0.005 per local SMS (10–25 Ks).
- **Infrastructure:** [Supabase Pro](https://supabase.com/pricing) is $25 a month and includes 100,000 monthly users and 100 GB of photo storage.
- **Not included:** the nutritionist, marketing, taxes and the team.

## What to change (cheap to do)

1. **Fewer free photo scans.** For example, 3 a day in the first week, then 1 a day. Keep text, voice, search and "same as yesterday" unlimited; they cost nothing because they run on the phone. This is the biggest saving and also gives a clearer reason to upgrade.
2. **Smaller scan photos.** Send 512 px instead of 800 px. That's about 266 image tokens instead of 638, ~60 % fewer. Check on the test photos that accuracy holds.
3. **Stop paying international SMS prices.**
   - Keep anonymous start and Google sign-in as the main paths; both are free.
   - Ask for a phone number only when someone buys a pass or restores an account.
   - Send codes through a local Myanmar SMS gateway (10–25 Ks per message, per sent.dm) using Supabase's Send SMS hook, not an international provider.
4. **Set the scan spending cap.** `SCAN_DAILY_BUDGET_USD` already exists. Set it so a viral day or abuse can't run up the bill. Add CAPTCHA on anonymous sign-up before launch (it's on the checklist).
5. **Delete meal photos after ~90 days** (on the checklist). It keeps storage within the Pro plan, and it's good for privacy.

## Pricing

Keep 4,900 Ks, and test these:
- **A 7-day pass (~1,500 Ks) or a scan top-up.** It suits prepaid habits and lowers the first purchase.
- **A bigger 3-month discount.** 12,900 Ks is only 12 % off.
- **Reprice every 6–12 months.** Inflation of 21–25 % erodes the price fast.
- **Prices for Burmese abroad in their own currency** (Thailand, Singapore, Japan, Malaysia). For example, 99 THB ≈ $3 a month is three times the Myanmar pass. This is the biggest upside the market research found.

## How others make money

| Model | Who | How it works | Fit for us |
|---|---|---|---|
| **Hard paywall** | Cal AI (15M+ downloads, $30M+ a year; [competitors](../research_notes/Sar%20AI%20Myanmar%20market%20research/competitors.md)) | Pay (around $30 a year, trial first) before using the app, so every AI call is paid for. | Not in Myanmar: too few people can pay. Possible for the diaspora. |
| **Freemium + subscription** | MyFitnessPal, Lose It, Lifesum | Free logging, paid extras. MyFitnessPal also shows ads. | What we do. It works if free use costs little, which means limiting scans. |
| **Subscription + human coaching** | HealthifyMe (India; most revenue from consumer plans, with a diabetes plan) ([Numerocracy](https://numerocracy.substack.com/p/transforming-health-how-healthifyme)) | A higher tier with a real dietitian or coach. | **Good fit.** A "dietitian check-in" tier at e.g. 15,000–25,000 Ks a month, using our nutritionist. High margin, needs no AI. OnDoctor already sells daily, weekly and monthly chat packages in Yangon. |
| **Paid by companies** (employers, insurers, clinics) | HealthifyMe corporate wellness (under 20 % of its revenue, 100+ companies) | The organisation pays per seat and the users don't. | Later. Clinics and the Myanmar Diabetes Association could refer patients first; paid deals need sales time. |
| **Ads** | MyFitnessPal (free tier) | Banner or video ads. | Weak. Myanmar ad rates are very low and ads hurt trust in a health app. Possible exception: "watch an ad for one more scan" roughly pays for that scan. |
| **Phone-credit billing** | ATOM, U9, Mytel through Codapay/Fortumo ([Coda](https://www.coda.co/payment-guides/atom/)) | The price is charged to the phone balance. | Worth asking about. It reaches people without KBZPay or WavePay and suits daily or weekly prices, but carriers take a large cut (rate not checked). |

## Unknowns to check

- KBZPay and WavePay merchant fees (ask their sales teams).
- Whether selling passes outside Google Play Billing is allowed for a Play-listed app (already a launch risk).
- Real tokens per scan and real scans per user. `scan_costs` will show both after the first users.
- Local SMS gateway prices and reliability.
