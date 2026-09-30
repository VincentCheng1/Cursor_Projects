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

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string for Prisma |
| `AUTH_SECRET` | Yes | Auth.js session signing secret |
| `TCGPLAYER_CLIENT_ID` | With secret | Authorized TCGplayer access; leave blank to disable |
| `TCGPLAYER_CLIENT_SECRET` | With id | TCGplayer OAuth client secret |
| `TCGPLAYER_API_BASE` | No | Defaults to `https://api.tcgplayer.com` |
| `TCGPLAYER_SALES_HISTORY_URL_TEMPLATE` | No | Authorized sales-history URL; `{productId}` replaced |
| `TCGPLAYER_CATEGORY_MAP` | No | e.g. `pokemon:3,one-piece:68` for catalog category IDs |
| `EBAY_CLIENT_ID` | With secret | eBay API credentials; leave blank to disable |
| `EBAY_CLIENT_SECRET` | With id | eBay OAuth client secret |
| `EBAY_ENVIRONMENT` | No | `production` (default) or `sandbox` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |

Secrets are server-side only and must never be exposed to the browser. Blank marketplace credentials **fail closed** — providers report not configured and never invent catalog rows or sales.

## Pricing engine

The core value is `calculateRecentSalesAverage` — the most recent **qualifying** sales (up to 20) for an exact card, variant, condition, and grade. Combined headline value pools sales from all sources into **one** calculation (spec §22); it is not the mean of per-source averages.

`MockTCGPlayerProvider` and `MockEbayProvider` load when `NODE_ENV=test` (Vitest) or when the dev server runs with `CARDVAULT_E2E=1` (Playwright). They never load in production.

## Multi-card price tracker (Phase 12b)

`/tracker` compares up to **8** COMBINED `PriceSnapshot` series on one Recharts overlay (`7D`–`ALL` ranges). Add cards by catalogue identity (card number, set, set type, foil, year) via `GET /api/cards/resolve`. Series persist in `TrackerSeries` (`GET/POST/PATCH/DELETE /api/tracker`, `GET /api/tracker/history`).

## End-to-end tests (Phase 18)

Playwright starts `npm run dev` with `CARDVAULT_E2E=1` so mock providers are active. Create an account at `/register` (or `POST /api/auth/register`), or use `POST /api/e2e/seed` for the credentials user (`e2e@cardvault.test`). `POST /api/e2e/pricing-expectations` returns the calculator oracle for assertions. E2E seed/oracle routes return 404 without `CARDVAULT_E2E=1`.

```bash
npx playwright install chromium
npm run test:e2e
```

Requires `DATABASE_URL` and `AUTH_SECRET` in `.env`, plus `prisma migrate deploy` and `prisma db seed` (the e2e global setup runs these automatically). GitHub Actions (`.github/workflows/ci.yml`) runs unit tests and Playwright against a Postgres service.

## Marketplace integrations

`TCGPlayerPriceProvider` and `EbayPriceProvider` implement a shared `PriceProvider` interface. Without valid credentials they remain disabled and report *integration not configured* — no fabricated prices.

- **TCGplayer**: OAuth client credentials against the official API; sales history uses `/pricing/product/{id}/sales` or `TCGPLAYER_SALES_HISTORY_URL_TEMPLATE` when your credential tier provides a different authorized endpoint.
- **eBay**: OAuth plus Finding API `findCompletedItems` with `SoldItemsOnly` — active listings are never used.

### Public data ingest (Phase 13a)

Authorized catalog APIs only — **never HTML scraping**. `CatalogProvider` implementations (`TCGPlayerCatalogProvider`, `EbayPublicDataProvider`) power:

- `SYNC_TCGPLAYER_CATEGORIES` / `SETS` / `PRODUCTS` — exhaustive category → group → product → variant walk
- `SYNC_EBAY_TAXONOMY` / `CATALOG_LINKS` / `SOLD_LISTINGS` — taxonomy leaves, EPID links, completed sales
- `SYNC_PUBLIC_DATA` — orchestrates configured surfaces

Admin controls live on `/admin/diagnostics`:

| Action | Endpoint | Behavior |
| --- | --- | --- |
| **Check sync readiness** | `POST /api/admin/public-data-sync?dryRun=1` | Reports which providers/surfaces would run; **no** API calls and **no** catalog writes |
| **Run public data sync** | `POST /api/admin/public-data-sync` | Rate-limited ingest for configured providers only; blocked with readiness payload when none are configured |
| Diagnostics | `GET /api/admin/diagnostics` | Provider status, missing env var **names**, surface coverage, sync readiness (never secret values) |

Unconfigured surfaces disable cleanly; marketplace list/market prices stay reference-only and never replace the 20-sale calculated value. §22 pooled combined value is unchanged.

### After you obtain live credentials

1. Copy `.env.example` → `.env` (if needed) and set the pairs you have:
   - TCGplayer: `TCGPLAYER_CLIENT_ID` + `TCGPLAYER_CLIENT_SECRET` (optional `TCGPLAYER_CATEGORY_MAP`, `TCGPLAYER_SALES_HISTORY_URL_TEMPLATE`)
   - eBay: `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` (optional `EBAY_ENVIRONMENT`)
2. Restart the Node / Next.js process so env vars load.
3. Sign in as an **admin** user and open `/admin/diagnostics`.
4. Confirm each provider shows **Configured** (missing env var names are listed when not).
5. Click **Check sync readiness** (dry-run) — review `surfacesEnabled` / next steps; no catalog is written.
6. Click **Run public data sync** to ingest authorized public catalog / sold data.
7. Refresh prices for collection cards via the UI refresh action or `POST /api/sync` with `SYNC_CARD_SALES` / `SNAPSHOT_PRICE` / `REFRESH_COLLECTION` once catalog external IDs exist.

Without credentials, stop at step 5 readiness — do not invent API keys, cards, or sales.

## Background jobs (Phase 15)

Authenticated `POST /api/sync` runs `SyncJob` records with exponential backoff:

- `SYNC_CARD_SALES` — fetch from configured providers and persist to `Sale`
- `CALCULATE_CARD_PRICE` — run the engine (no snapshot)
- `SNAPSHOT_PRICE` — refresh and write `PriceSnapshot` rows
- `REFRESH_COLLECTION` — sync + snapshot for each collection item
- Phase 13a catalog / public-data job types above (also via admin sync)

`GET /api/sync/{jobId}` returns job status. `GET /api/sync/providers` shows provider health and last successful sync.

## Collection import / export (Phase 16)

- `GET /api/collection/export` — CSV with the §36 column list (including server-calculated value, profit, ROI).
- `POST /api/collection/import` — `{ csv, commit }`. Validates every row before any database write; `commit: false` previews, `commit: true` imports only when validation is clean.

## Security (Phase 17)

Collection mutations enforce session user ownership (`updateMany` / `deleteMany` with `userId`). Security headers are set in `middleware.ts`. Admin diagnostics at `/admin/diagnostics` and `GET /api/admin/diagnostics` (no secrets exposed) include per-surface public-data coverage and the rate-limited sync control.
