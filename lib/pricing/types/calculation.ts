import type { SaleMatchCriteria } from "./card";
import type { CurrencyCode } from "./currency";
import type { Sale, SaleSource } from "./sale";

/** How shipping is folded into the price used for averaging (spec §19). */
export const SHIPPING_MODES = ["SALE_PRICE_ONLY", "SALE_PLUS_SHIPPING"] as const;
export type ShippingMode = (typeof SHIPPING_MODES)[number];

export const DEFAULT_SHIPPING_MODE: ShippingMode = "SALE_PLUS_SHIPPING";

/** The default and maximum number of recent sales an average may be built from (spec §3). */
export const DEFAULT_MAX_SALES = 20;

export type CalculationStatus = "CALCULATED" | "INSUFFICIENT_DATA";

/** Why a sale was dropped before the average was taken. Surfaced for transparency (spec §29). */
export type ExclusionReason =
  | "INVALID_PRICE"
  | "INVALID_DATE"
  | "FUTURE_DATE"
  | "UNKNOWN_CURRENCY"
  | "CURRENCY_MISMATCH"
  | "DUPLICATE"
  | "MULTI_CARD_LOT"
  | "CARD_MISMATCH"
  | "VARIANT_MISMATCH"
  | "PRINTING_MISMATCH"
  | "SET_MISMATCH"
  | "CARD_NUMBER_MISMATCH"
  | "GAME_MISMATCH"
  | "LANGUAGE_MISMATCH"
  | "CONDITION_MISMATCH"
  | "GRADING_MISMATCH"
  | "GRADE_MISMATCH"
  | "UNKNOWN_CONDITION"
  | "UNKNOWN_GRADING"
  | "UNKNOWN_CARD"
  /** Calculation refused because match criteria were missing or too thin (§16). */
  | "INSUFFICIENT_MATCH_CRITERIA";

export interface ExcludedSale {
  sale: Sale;
  reason: ExclusionReason;
}

/** A sale that made it into the average, with the exact figure that was summed. */
export interface UsedSale {
  sale: Sale;
  /** Sale price, or sale + shipping, depending on the shipping mode. Rounded to cents. */
  effectivePrice: number;
}

/** Options accepted by `calculateRecentSalesAverage` (spec §18). */
export interface PriceCalculationOptions {
  /** Restricts the calculation to sales that provably match this exact printing/state. */
  match?: SaleMatchCriteria;
  /** Which amount of each sale is summed (spec §19). Applied uniformly across the set. */
  shippingMode?: ShippingMode;
  /** Sales in any other currency are excluded rather than converted (spec §20). */
  currency?: CurrencyCode;
  /** Injectable clock; sales dated in the future are treated as invalid. */
  now?: Date;
}

/** Result of the 20-sale calculation (spec §18). */
export interface AverageResult {
  average: number | null;
  median: number | null;
  minimum: number | null;
  maximum: number | null;

  salesUsed: number;
  salesAvailable: number;

  oldestSaleDate: Date | null;
  newestSaleDate: Date | null;

  status: CalculationStatus;

  currency: CurrencyCode;
  shippingMode: ShippingMode;
  maxSales: number;

  /** Exactly the sales that produced `average`, newest first (spec §29). */
  usedSales: UsedSale[];
  /** Everything that was considered and rejected, with the reason. */
  excludedSales: ExcludedSale[];
}

/**
 * The card's headline value plus the per-source transparency breakdown (spec §22).
 *
 * `combined` is a single §18 calculation over the pooled, cross-source
 * deduplicated sales — not a mean of the `bySource` averages. `bySource` exists
 * only to populate the §21 breakdown and is computed over each source's sales
 * alone, capped at 20 per source, so the two counts legitimately differ.
 */
export interface CombinedValueResult {
  combined: AverageResult;
  bySource: Partial<Record<SaleSource, AverageResult>>;
}
