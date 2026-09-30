import { isMockProviderRuntime } from "@/lib/pricing/providers/mock-env";
import { tcgplayerIsConfigured } from "@/lib/tcgplayer/config";

/**
 * Whether CardVault should use public TCGCSV feeds (https://tcgcsv.com) as the
 * TCGplayer-shaped catalog / market-price source.
 *
 * Enable when:
 * - `CARDVAULT_PRICE_SOURCE=tcgcsv`, or
 * - `TCGCSV_ENABLED=1|true|on`, or
 * - TCGplayer API credentials are unset (auto), except in mock/test runtimes
 *   so Vitest/Playwright never hit the live CDN by accident.
 *
 * Disable when:
 * - `CARDVAULT_PRICE_SOURCE=tcgplayer` (prefer official API), or
 * - `TCGCSV_ENABLED=0|false|off`, or
 * - official TCGplayer credentials are set and source is not forced to tcgcsv.
 *
 * No marketplace secrets are required — TCGCSV publishes daily public JSON/CSV.
 */
export function tcgcsvIsEnabled(): boolean {
  const source = (process.env.CARDVAULT_PRICE_SOURCE ?? "").trim().toLowerCase();
  if (source === "tcgcsv") return true;
  if (source === "tcgplayer") return false;

  const explicit = (process.env.TCGCSV_ENABLED ?? "").trim().toLowerCase();
  if (explicit === "0" || explicit === "false" || explicit === "off") return false;
  if (explicit === "1" || explicit === "true" || explicit === "on") return true;

  // Prefer official authorized TCGplayer API when credentials exist.
  if (tcgplayerIsConfigured()) return false;

  // Auto-fallback for Production/dev without TCGPLAYER_* — not in test/e2e mocks.
  if (isMockProviderRuntime()) return false;
  return true;
}

/** True when the TCGPLAYER catalog/price slot should be served by TCGCSV. */
export function tcgcsvServesTcgplayerSlot(): boolean {
  return tcgcsvIsEnabled();
}

export function tcgcsvBaseUrl(): string {
  const raw = process.env.TCGCSV_BASE_URL?.trim();
  if (raw !== undefined && raw !== "") return raw.replace(/\/$/, "");
  return "https://tcgcsv.com";
}

/** TCGCSV docs require a custom User-Agent (generic agents may be blocked). */
export function tcgcsvUserAgent(): string {
  const raw = process.env.TCGCSV_USER_AGENT?.trim();
  if (raw !== undefined && raw !== "") return raw;
  return "CardVault/0.1.0 (+https://github.com/VincentCheng1/Cursor_Projects)";
}

/**
 * Minimum spacing between TCGCSV requests (docs: ~100ms; FAQ examples use 250ms).
 * Default 150ms keeps us under their throttle while syncing many groups.
 */
export function tcgcsvMinIntervalMs(): number {
  const raw = process.env.TCGCSV_MIN_INTERVAL_MS;
  if (raw === undefined || raw === "") return 150;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 150;
}
