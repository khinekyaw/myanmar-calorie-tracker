# Sar AI

Calorie tracking for Myanmar — snap a photo, see kcal and plates of rice. Burmese + English.

```bash
npm install
npx expo run:android   # first time: builds and installs the dev app
npx expo start         # afterwards: start Metro and open the installed app
```

Backend (optional; the app runs on mocks without it): `npm run db:start`, then `cp .env.example .env.local` — see [BACKEND.md](docs/BACKEND.md#running-locally).

Docs: [product brief](docs/PRODUCT_BRIEF.md) · [architecture](docs/ARCHITECTURE.md) · [backend](docs/BACKEND.md) · [offline & sync](docs/OFFLINE.md) · [decisions](docs/DECISIONS.md)
