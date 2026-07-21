# FeastGo

A premium food delivery web app — original branding, design and codebase, inspired by
the overall UX category Zomato popularized (browse restaurants, order food, track delivery).

**Stack:** Angular 22 (standalone components + signals) · Node.js/Express · MongoDB · Tailwind CSS v4.

## Project structure

```
client/   Angular app (UI)
server/   Express API + MongoDB models, auth, orders, seed data
```

## Prerequisites

- Node.js 20+
- MongoDB running locally on `mongodb://127.0.0.1:27017` (or update `server/.env`)

## 1. Start the API

```bash
cd server
npm install          # first time only
cp .env.example .env # first time only — edit JWT_SECRET for real use
npm run seed          # populates restaurants, menus & a demo user
npm run dev            # http://localhost:4000
```

## 2. Start the client

```bash
cd client
npm install   # first time only
npm start      # http://localhost:4200
```

## Demo account

Sign in with phone `+1 555-0100` — FeastGo uses phone + OTP login (no password).
There's no SMS provider wired up, so the OTP is generated server-side and shown
directly in the UI ("Demo mode — your code is ####") for any phone number you enter.

## Notable design decisions

- **Mock/original assets**: restaurant covers, logos and dish photos are generated as
  SVGs at seed time (`server/src/seed/svg.js`) rather than pulled from a third-party
  image host — deterministic, original, and fully offline.
- **Auth**: phone + OTP, like Zomato — no passwords. OTPs are generated in-memory
  server-side (`server/src/utils/otpStore.js`, 5 min expiry, 5 attempt cap) since no
  SMS provider is configured; the code is returned to the client and shown inline for
  testing. JWT bearer token is stored client-side (`localStorage`) and attached via an
  Angular HTTP interceptor, which avoids cross-port cookie ambiguity between
  `4200`/`4000` in local dev.
- **Order tracking**: placing an order kicks off a server-side timer that advances the
  order through `confirmed → preparing → out_for_delivery → delivered` automatically,
  so the tracking page has real transitions to poll for, without needing a courier
  network.
- **Single-restaurant cart**: adding an item from a different restaurant than what's
  already in the cart prompts a confirm dialog (mirrors how most delivery apps work).
