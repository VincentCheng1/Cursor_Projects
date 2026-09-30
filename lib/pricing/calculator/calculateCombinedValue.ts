import { calculateRecentSalesAverage } from "./calculateRecentSalesAverage";
import {
  DEFAULT_MAX_SALES,
  type CombinedValueResult,
  type PriceCalculationOptions,
} from "../types/calculation";
import { SALE_SOURCES, type Sale, type SaleSource } from "../types/sale";

/**
 * Pooled multi-source headline value (spec §22).
 *
 * `combined` is one §18 pass over all sources' sales with cross-source dedupe.
 * `bySource` is for the §21 transparency breakdown only — each source capped at 20.
 */
export function calculateCombinedValue(
  salesBySource: Partial<Record<SaleSource, Sale[]>>,
  maxSales = DEFAULT_MAX_SALES,
  options: PriceCalculationOptions = {},
): CombinedValueResult {
  const pooled: Sale[] = [];
  for (const source of SALE_SOURCES) {
    const rows = salesBySource[source];
    if (rows !== undefined) pooled.push(...rows);
  }

  const combined = calculateRecentSalesAverage(pooled, maxSales, options);

  const bySource: Partial<Record<SaleSource, ReturnType<typeof calculateRecentSalesAverage>>> =
    {};

  for (const source of SALE_SOURCES) {
    const rows = salesBySource[source];
    if (rows === undefined || rows.length === 0) continue;
    bySource[source] = calculateRecentSalesAverage(rows, maxSales, options);
  }

  return { combined, bySource };
}

/** @deprecated Wrong formula — kept only so tests can prove it diverges from §22. */
export function wrongMeanOfSourceAverages(
  bySource: CombinedValueResult["bySource"],
): number | null {
  const avgs: number[] = [];
  for (const source of SALE_SOURCES) {
    const result = bySource[source];
    if (result?.average !== null && result?.average !== undefined) {
      avgs.push(result.average);
    }
  }
  if (avgs.length === 0) return null;
  const sum = avgs.reduce((a, b) => a + b, 0);
  return Math.round((sum / avgs.length) * 100) / 100;
}
