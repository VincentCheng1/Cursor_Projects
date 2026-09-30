const lastRefresh = new Map<string, number>();

function cooldownMs(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** E2E shares one Next process across Playwright retries; zero cool-downs avoid flake. */
const e2eRelaxed = process.env.CARDVAULT_E2E === "1";

const SINGLE_CARD_COOLDOWN_MS = cooldownMs(
  "PRICE_REFRESH_COOLDOWN_MS",
  e2eRelaxed ? 0 : 60_000,
);
const COLLECTION_COOLDOWN_MS = cooldownMs(
  "COLLECTION_REFRESH_COOLDOWN_MS",
  e2eRelaxed ? 0 : 300_000,
);
const PUBLIC_DATA_SYNC_COOLDOWN_MS = cooldownMs(
  "PUBLIC_DATA_SYNC_COOLDOWN_MS",
  e2eRelaxed ? 0 : 900_000,
);

export function assertRefreshAllowed(key: string, cooldownMs: number): void {
  const now = Date.now();
  const last = lastRefresh.get(key);
  if (last !== undefined && now - last < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - (now - last)) / 1000);
    throw new Error(`Rate limit: try again in ${waitSec}s`);
  }
  lastRefresh.set(key, now);
}

/** Clears in-memory refresh cooldowns (e2e seed / retry isolation). */
export function clearRefreshCooldowns(): void {
  lastRefresh.clear();
}

export function assertSingleCardRefreshAllowed(userId: string, cardId: string): void {
  assertRefreshAllowed(`card:${userId}:${cardId}`, SINGLE_CARD_COOLDOWN_MS);
}

export function assertCollectionRefreshAllowed(userId: string): void {
  assertRefreshAllowed(`collection:${userId}`, COLLECTION_COOLDOWN_MS);
}

/** Admin “Run public data sync” control — never a scrape trigger (§45 / §14b). */
export function assertPublicDataSyncAllowed(userId: string): void {
  assertRefreshAllowed(`public-data:${userId}`, PUBLIC_DATA_SYNC_COOLDOWN_MS);
}
