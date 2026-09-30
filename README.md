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

`MockTCGPlayerProvider` and `MockEbayProvider` load only when `NODE_ENV=test`.

## Marketplace integrations

`TCGPlayerPriceProvider` and `EbayPriceProvider` implement a shared `PriceProvider` interface. Without valid credentials they remain disabled and report *integration not configured* — no fabricated prices.
