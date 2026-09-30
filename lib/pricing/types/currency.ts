/**
 * Currency handling (spec §20).
 *
 * Calculations are normalized to USD. Other currencies are modelled now so that
 * conversion can be added later, but sales in a currency other than the target
 * are excluded from a calculation rather than averaged together.
 */
export const SUPPORTED_CURRENCIES = ["USD", "CAD", "EUR", "GBP", "JPY", "AUD"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
