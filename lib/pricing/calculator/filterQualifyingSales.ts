import { DEFAULT_CURRENCY } from "../types/currency";
import type { CurrencyCode } from "../types/currency";
import type { ExcludedSale, ExclusionReason, PriceCalculationOptions } from "../types/calculation";
import type { Sale } from "../types/sale";
import { partitionDuplicates } from "./deduplicateSales";
import { hasSufficientMatchCriteria, matchSaleReason } from "./matchSale";
import { validateSale } from "./validateSale";

export interface QualifyingSalesResult {
  qualifying: Sale[];
  excluded: ExcludedSale[];
}

/**
 * Steps 1–4 of §18 before sort/limit: validate, dedupe, identity match, currency.
 */
export function filterQualifyingSales(
  sales: Sale[],
  options: PriceCalculationOptions = {},
): QualifyingSalesResult {
  const now = options.now ?? new Date();
  const targetCurrency: CurrencyCode = options.currency ?? DEFAULT_CURRENCY;
  const match = options.match;

  // Refuse rather than silently averaging an unscoped pool (spec §16).
  if (!hasSufficientMatchCriteria(match)) {
    return {
      qualifying: [],
      excluded: sales.map((sale) => ({
        sale,
        reason: "INSUFFICIENT_MATCH_CRITERIA" as const,
      })),
    };
  }

  const excluded: ExcludedSale[] = [];
  const afterValid: Sale[] = [];

  for (const sale of sales) {
    const invalid = validateSale(sale, now);
    if (invalid !== null) {
      excluded.push({ sale, reason: invalid });
      continue;
    }
    afterValid.push(sale);
  }

  const { unique, duplicates } = partitionDuplicates(afterValid);
  for (const sale of duplicates) {
    excluded.push({ sale, reason: "DUPLICATE" });
  }

  const qualifying: Sale[] = [];
  const criteria = match!;

  for (const sale of unique) {
    const reason = matchSaleReason(sale, criteria, targetCurrency);
    if (reason !== null) {
      excluded.push({ sale, reason });
      continue;
    }
    qualifying.push(sale);
  }

  return { qualifying, excluded };
}
