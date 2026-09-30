# CardVault

**Track your collection. Know what it's worth.**

CardVault is a web application for tracking Pokémon TCG and One Piece card collections and calculating card values from recent completed marketplace sales.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `DATABASE_URL` and `AUTH_SECRET` in `.env`.

## Database

```bash
npx prisma migrate dev
npx prisma db seed
```

`prisma validate` and `prisma generate` work without a live database for CI.

## Development

```bash
npm run dev
```

## Tests

```bash
npm run test
npm run test:e2e
```

## Type check & lint

```bash
npm run typecheck
npm run lint
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `AUTH_SECRET` | Auth.js session signing secret |
| `TCGPLAYER_CLIENT_ID` / `TCGPLAYER_CLIENT_SECRET` | Authorized TCGplayer access; leave blank to disable |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | eBay API credentials; leave blank to disable |
| `EBAY_ENVIRONMENT` | `production` or sandbox |
| `NEXT_PUBLIC_APP_URL` | Public app URL |

Secrets are server-side only and must never be exposed to the browser.

## Pricing engine

The core value is `calculateRecentSalesAverage` — the most recent **qualifying** sales (up to 20) for an exact card, variant, condition, and grade. Combined headline value pools sales from all sources into **one** calculation (spec §22); it is not the mean of per-source averages.

`MockTCGPlayerProvider` and `MockEbayProvider` load when `NODE_ENV=test` (Vitest) or when the dev server runs with `CARDVAULT_E2E=1` (Playwright). They never load in production.

## Multi-card price tracker (Phase 12b)

`/tracker` compares up to **8** COMBINED `PriceSnapshot` series on one Recharts overlay (`7D`–`ALL` ranges). Add cards by catalogue identity (card number, set, set type, foil, year) via `GET /api/cards/resolve`. Series persist in `TrackerSeries` (`GET/POST/PATCH/DELETE /api/tracker`, `GET /api/tracker/history`).

## End-to-end tests (Phase 18)

Playwright starts `npm run dev` with `CARDVAULT_E2E=1` so mock providers are active. There is no public registration UI; `POST /api/e2e/seed` creates a credentials user (`e2e@cardvault.test`). `POST /api/e2e/pricing-expectations` returns the calculator oracle for assertions. Both routes return 404 without `CARDVAULT_E2E=1`.

```bash
npx playwright install chromium
npm run test:e2e
```

Requires `DATABASE_URL` and `AUTH_SECRET` in `.env`, plus `prisma migrate deploy` and `prisma db seed` (the e2e global setup runs these automatically).

## Marketplace integrations

`TCGPlayerPriceProvider` and `EbayPriceProvider` implement a shared `PriceProvider` interface. Without valid credentials they remain disabled and report *integration not configured* — no fabricated prices.

- **TCGplayer**: OAuth client credentials against the official API; sales history uses `/pricing/product/{id}/sales` or `TCGPLAYER_SALES_HISTORY_URL_TEMPLATE` when your credential tier provides a different authorized endpoint.
- **eBay**: OAuth plus Finding API `findCompletedItems` with `SoldItemsOnly` — active listings are never used.

## Background jobs (Phase 15)

Authenticated `POST /api/sync` runs `SyncJob` records with exponential backoff:

- `SYNC_CARD_SALES` — fetch from configured providers and persist to `Sale`
- `CALCULATE_CARD_PRICE` — run the engine (no snapshot)
- `SNAPSHOT_PRICE` — refresh and write `PriceSnapshot` rows
- `REFRESH_COLLECTION` — sync + snapshot for each collection item

`GET /api/sync/{jobId}` returns job status. `GET /api/sync/providers` shows provider health and last successful sync.

## Collection import / export (Phase 16)

- `GET /api/collection/export` — CSV with the §36 column list (including server-calculated value, profit, ROI).
- `POST /api/collection/import` — `{ csv, commit }`. Validates every row before any database write; `commit: false` previews, `commit: true` imports only when validation is clean.

## Security (Phase 17)

Collection mutations enforce session user ownership (`updateMany` / `deleteMany` with `userId`). Security headers are set in `middleware.ts`. Admin diagnostics at `/admin/diagnostics` and `GET /api/admin/diagnostics` (no secrets exposed).
