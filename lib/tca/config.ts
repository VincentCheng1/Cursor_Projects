/**
 * The Card API (TCA) — REST market sales feed used as an eBay completed-sales
 * replacement when `TCA_API_KEY` is set.
 *
 * Docs: https://www.thecardapi.com/docs
 * Auth header: `x-market-api-key`
 * Keys are prefixed `tca_`. Never log or commit the key value.
 */

export const TCA_ENV_API_KEY = "TCA_API_KEY";
export const TCA_ENV_API_BASE = "TCA_API_BASE";

/** Default Market API base (paths like `/sales` are appended). */
export const TCA_DEFAULT_API_BASE = "https://www.thecardapi.com/api/v1/market";

export function tcaIsConfigured(): boolean {
  const key = process.env[TCA_ENV_API_KEY];
  return key !== undefined && key !== "";
}

export function tcaApiKey(): string | undefined {
  const key = process.env[TCA_ENV_API_KEY];
  if (key === undefined || key === "") return undefined;
  return key;
}

export function tcaApiBase(): string {
  const base = process.env[TCA_ENV_API_BASE];
  if (base !== undefined && base.trim() !== "") {
    return base.replace(/\/$/, "");
  }
  return TCA_DEFAULT_API_BASE;
}

/** Platform filter for the EBAY CardVault slot — completed eBay sales only. */
export function tcaEbayPlatformParam(): string {
  return "ebay";
}
