# FeastGo Frontend

FeastGo is a responsive food-ordering demo built with Angular 22. It runs entirely in the browser with built-in demo data; no backend or database is required.

## Run locally

```bash
npm ci
npm start
```

Open `http://localhost:4200`.

## Build

```bash
npm run build
```

The production-ready static site is generated in `dist/client/browser`.

## Demo behavior

- Customer login uses demo mobile number `9876543210` and OTP `123456`. Sign up with a valid 10-digit mobile number, a 3–50 character name, and accepted terms.
- Seller, delivery and admin demo forms accept any non-empty credentials.
- Changes are saved in the browser's `localStorage`. Use **Settings → Local Testing Data** to clear demo state.
- Sign-in, checkout, payments, messaging and notifications are simulations. No real orders or payments are processed.

This repository contains only the frontend. The Express/MongoDB backend is not required or included.
