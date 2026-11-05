# Payment options for Premium

Research notes from November 2026 (2026-11-05). **No decision yet.** This compares how Sar AI could take money for Premium passes:

- inside the app
- on our own website
- with gift codes

The Google Play policy points need a final check against the live policy page before launch. The provider fees and features come from third-party pages and haven't been confirmed with the providers.

## Summary

- **Inside the app**, Google Play's rule is: digital goods bought in the app go through **Google Play Billing**.
  - In Myanmar, Play Billing takes **only international Visa / Mastercard / Amex / Discover**. There's no carrier billing, gift cards or wallets. Google keeps 15%.
  - Few people hold a card that works abroad, so in Myanmar this mostly reaches better-off city users and Burmese abroad.
- **KBZPay / WavePay / MPU inside the app** would break that rule.
- **Our own website** can take any payment method, because Play's rules don't cover what happens outside the app.
  - Play explicitly allows a **"consumption-only" (reader) app**: one with nothing to buy inside it, where the user signs in and uses what they paid for elsewhere.
  - So: sell passes or gift codes on the website, and have the app only redeem codes or read the account. That looks allowed as long as **the app itself sells nothing**.
- **Gift codes given away for free** (promotions, partners, testers, Play review) are fine in any case.
- **Open:** Google doesn't clearly say whether an app that sells through Play Billing may *also* honour passes bought on a website. Many apps do this; the policy page doesn't spell it out.

## Google Play rules that matter

From [Understanding Google Play's Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en):

- **The general rule:** within the app, developers may not lead users to a payment method other than Google Play's billing system. Exceptions are the regional programmes (EEA, US, India, South Korea, the user-choice pilot); Myanmar isn't one of them.
- **Outside the app** you are free to tell users about other ways to buy: the website, Facebook, Viber, flyers.
- **Consumption-only (reader) apps are allowed**, "even if it is part of a paid service". The FAQ's example is a user who signs in when the app opens and gets content they paid for somewhere else.
  - Consumption-only means nothing can be bought inside the app.
  - The FAQ even allows mentioning the website as the place to buy, as long as it **isn't a direct link** (its example: "Head to our website to purchase more"). Confirm the exact wording before relying on it.
- **Admin links are fine** (account page, privacy policy, help), as long as those pages don't lead on to an outside payment.
- **Where Play Billing isn't available** in a country, the Play Billing rule doesn't apply there. Myanmar *does* have Play Billing for in-app items in MMK ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/138294)), so this doesn't help us.
- **The gift-card FAQ** says selling gift cards in an app doesn't need Play Billing, whether the card is an eGift or physically mailed. It probably means gift cards for goods and services outside the app. Don't read it as "Premium codes can be sold inside the app" without a policy read.

### What this means for each model

| Model | In the app | Allowed? |
|---|---|---|
| Free gift codes only | Code input; no prices | Yes |
| **Consumption-only:** passes or codes sold on the website | Code input and/or sign-in; no pay buttons; at most a plain (unlinked) "buy on our website" | Looks allowed; confirm the wording |
| Play Billing in the app | Card payments via Google; 15% fee | Yes |
| Play Billing in the app **+** website sales | The app sells through Play and also honours web passes; it must never mention the website as a place to buy | Unclear (not addressed) |
| KBZPay / WavePay / MPU buttons in the app | Outside payment inside the app | No (risk of removal) |

## Payment providers

### Google Play Billing (in the app)

- **Who can pay:** Myanmar buyers use international cards only ([Play payment methods](https://support.google.com/googleplay/answer/2651410?hl=en)). Burmese abroad (e.g. in Thailand) get their country's Play payment methods.
- **Who can sell:** Myanmar is listed for developer and merchant registration, paid out in USD ([Play Console supported locations](https://support.google.com/googleplay/android-developer/answer/9306917); first reported in [2018](https://www.androidpolice.com/2018/12/17/google-play-gift-cards-come-to-malaysia-merchant-registration-available-in-myanmar-slovenia-and-uruguay/)). The table has no date; check it in the live Play Console.
- **Fit:** prepaid passes become one-time products with no auto-renew. The server verifies the purchase token with Google and calls `grant_pass` (provider `play`, reference = order id).
- **Fee:** 15%.

### Local payment providers (website, or the app only if it's allowed)

- **Dinger:**
  - One connection for Visa, Mastercard, JCB and **MPU** (Myanmar's own debit cards), plus KBZPay, WavePay, AYA Pay, CB Pay and other wallets and mobile banking.
  - Third-party figures: about 3.9% for cards, 1.9% + 100 Ks for KBZPay, and a 100,000 Ks monthly fee, from an unclaimed listing ([paymentproviders.io](https://paymentproviders.io/providers/dinger.md)).
  - Reportedly no test environment for cards, and card payments redirect to a hosted page ([unofficial Node client](https://unpkg.com/dinger-merchant-pay-api@1.2.1/README.md)). Get official terms from Dinger.
- **KBZPay / WavePay directly:**
  - Wave has an online merchant API ("Pay with Wave": merchant id + secret, payment notifications); see [market research](Sar%20AI%20Myanmar%20market%20research.md).
  - KBZPay and Wave together reach about half of adults ([Kaadxpay](https://www.kaadxpay.com/en/countries/myanmar)).
  - That means two contracts and two integrations instead of one.
- **2C2P:** works in Myanmar (it's among the providers in [laravel-myanmar-payments](https://github.com/laranex/laravel-myanmar-payments)). Its rates and how to sign up weren't found.
- **Cards in general:** Visa, Mastercard and MPU are mostly accepted in the big cities ([Papaya Global](https://www.papayaglobal.com/paymentspedia/myanmar/)).
- **Stripe / PayPal:** not believed to serve Myanmar businesses. Not checked this time.

### All local providers

- **Need a business:** expect to need a registered Myanmar business and an MMK bank account.
- **Sanctions:** screen the payment chain (banks, wallet owners) against OFAC, EU and UK lists ([market research](Sar%20AI%20Myanmar%20market%20research.md) → "Sanctions exposure").
- **Notifications:** each provider's payment notification must be checked for a valid signature, handled safely if it arrives twice, and passed to `grant_pass`. That's the same LAUNCH_CHECKLIST item as for KBZPay.

## Selling on our own website

Two ways to do it. Both end in `grant_pass` on the server.

1. **Sell gift codes.**
   - The buyer pays on the website, with no account needed, and sees the code; it's also sent by SMS or email.
   - They type it into the app.
   - Pluses: no sign-in on the website, and it works for gifts (a child buying for a parent).
   - Minus: one extra step for the buyer.
   - Builds on the gift-code plan ([LAUNCH_CHECKLIST → Gift codes](../docs/LAUNCH_CHECKLIST.md#gift-codes-premium-before-payments)).
2. **Sell to the account.**
   - The buyer signs in on the website with the same phone number or Google account, and the pass shows up in the app after the next sync.
   - Plus: no code to type.
   - Minuses: web sign-in, and another SMS (about $0.16–0.33 each; [Unit economics](Unit%20economics.md)).

Things to watch:

- **Payment methods:** the website can offer everything Dinger or the wallets support (KBZPay, WavePay, AYA Pay, CB Pay, MPU, Visa / Mastercard). That's far more than Play offers in Myanmar.
- **Reaching the site:** the website must open on Myanmar networks without a VPN, and load fast on 3G. Facebook is blocked, so links shared there reach fewer people.
- **Mobile site:** the website must be mobile-first, in Burmese and English, and say clearly that there's no auto-renew.
- **Turnstile:** checkout should keep its CAPTCHA (Turnstile), because code sales are also a target for card testing (fraudsters checking stolen card numbers with small purchases).
- **Paperwork:** receipts, refunds, and tax on the income; the terms page should cover them.
- **iPhone later:** Apple's rules for reader apps differ from Google's; check them before an iOS release.

## Still to find out

- The exact current wording of the consumption-only FAQ (especially the unlinked "buy on our website" line), and whether an app with Play Billing may also honour web passes. A policy or legal read is safest.
- Dinger's and 2C2P's official rates, sign-up requirements (business registration), payout times, and whether they accept a foreign-owned business.
- How many target users have a card that works abroad (it decides whether Play Billing is worth its 15%).
- Whether Google prices MMK items at the official kyat rate or the market rate (it affects USD payouts).
