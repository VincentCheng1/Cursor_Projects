const lastRefresh = new Map<string, number>();

const SINGLE_CARD_COOLDOWN_MS = Number(process.env.PRICE_REFRESH_COOLDOWN_MS ?? 60_000);
const COLLECTION_COOLDOWN_MS = Number(process.env.COLLECTION_REFRESH_COOLDOWN_MS ?? 300_000);

export function assertRefreshAllowed(key: string, cooldownMs: number): void {
  const now = Date.now();
  const last = lastRefresh.get(key);
  if (last !== undefined && now - last < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - (now - last)) / 1000);
    throw new Error(`Rate limit: try again in ${waitSec}s`);
  }
  lastRefresh.set(key, now);
}

export function assertSingleCardRefreshAllowed(userId: string, cardId: string): void {
  assertRefreshAllowed(`card:${userId}:${cardId}`, SINGLE_CARD_COOLDOWN_MS);
}

export function assertCollectionRefreshAllowed(userId: string): void {
  assertRefreshAllowed(`collection:${userId}`, COLLECTION_COOLDOWN_MS);
}
