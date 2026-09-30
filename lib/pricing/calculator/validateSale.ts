import { tryToDecimal } from "../money";
import { normalizeCurrency } from "../normalizer/normalizeCurrency";
import type { ExclusionReason } from "../types/calculation";
import type { Sale } from "../types/sale";

/**
 * Step 1 of §18: drop records that cannot be trusted as completed sales.
 *
 * A record is invalid — not merely unmatched — when its price or date is
 * missing, malformed, negative, or in the future, or when its currency cannot
 * be identified at all.
 */
export function validateSale(sale: Sale, now: Date): ExclusionReason | null {
  const price = tryToDecimal(sale.salePrice);
  if (price === null || price.isNegative() || price.isZero()) {
    return "INVALID_PRICE";
  }

  if (!(sale.saleDate instanceof Date) || Number.isNaN(sale.saleDate.getTime())) {
    return "INVALID_DATE";
  }

  if (sale.saleDate.getTime() > now.getTime()) {
    return "FUTURE_DATE";
  }

  if (normalizeCurrency(sale.currency) === undefined) {
    return "UNKNOWN_CURRENCY";
  }

  return null;
}

export function isValidSale(sale: Sale, now: Date = new Date()): boolean {
  return validateSale(sale, now) === null;
}
