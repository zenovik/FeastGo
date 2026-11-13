# FeastGo

A premium food delivery web app — original branding, design and codebase, inspired by
the overall UX category Zomato popularized (browse restaurants, order food, track delivery).

**Stack:** Angular 22 (standalone components + signals) · Tailwind CSS v4. The client currently runs in frontend-only demo mode; the Express/MongoDB server is preserved but not required.

## Project structure

```
client/   Angular app (UI)
server/   Express API + MongoDB models, auth, orders, seed data
```

## Run the frontend-only demo

```bash
cd client
npm install          # first time only
npm start            # http://localhost:4200
# If port 4200 is already in use:
npm start -- --port 4201
```

## Demo behavior

- All API calls are handled inside the Angular app; MongoDB and the Express server are not contacted.
- Restaurant, menu, order, seller, delivery and admin pages use built-in demo records.
- Customer login uses demo mobile number `9876543210` and OTP `123456`; signup requires a valid mobile number, name and accepted terms. Seller, delivery and admin demo forms accept any non-empty credentials.
- Changes are saved in this browser's `localStorage`; clearing site data restores the original demo records.
- Checkout, account settings and management actions are simulations only; no real orders, payments, messages or notifications are sent.

The backend source and seed scripts remain under `server/` for when the live API is needed again. The client API setting is in `client/src/app/core/config.ts`.

## Notable design decisions

- **Demo assets and data**: the client generates original food artwork locally and
  ships fictional restaurant/menu records in `client/src/app/core/mock/mock-data.ts`.
- **Demo persistence**: a local API interceptor handles app requests and stores
  editable demo records in browser `localStorage`; no remote service is contacted.
- **Single-restaurant cart**: adding an item from a different restaurant than what's
  already in the cart prompts a confirm dialog.
- **Backend restoration**: the Express API, MongoDB models and seed scripts are
  preserved under `server/`; point `API_URL` in the client config back to
  `http://localhost:4000/api` to reconnect the frontend to that API.
