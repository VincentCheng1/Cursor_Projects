import {
  DEFAULT_MAX_SALES,
  DEFAULT_SHIPPING_MODE,
  type AverageResult,
  type ExcludedSale,
  type PriceCalculationOptions,
  type UsedSale,
} from "../types/calculation";
import { DEFAULT_CURRENCY } from "../types/currency";
import {
  maxMoney,
  meanMoney,
  medianMoney,
  minMoney,
  toMoneyNumber,
  tryToDecimal,
} from "../money";
import type { Sale } from "../types/sale";
import { filterQualifyingSales } from "./filterQualifyingSales";
import { saleAmount } from "./saleAmount";

function insufficient(
  options: PriceCalculationOptions,
  maxSales: number,
  excluded: ExcludedSale[],
): AverageResult {
  return {
    average: null,
    median: null,
    minimum: null,
    maximum: null,
    salesUsed: 0,
    salesAvailable: 0,
    oldestSaleDate: null,
    newestSaleDate: null,
    status: "INSUFFICIENT_DATA",
    currency: options.currency ?? DEFAULT_CURRENCY,
    shippingMode: options.shippingMode ?? DEFAULT_SHIPPING_MODE,
    maxSales,
    usedSales: [],
    excludedSales: excluded,
  };
}

/**
 * Core 20-sale average (spec §3, §18).
 */
export function calculateRecentSalesAverage(
  sales: Sale[],
  maxSales = DEFAULT_MAX_SALES,
  options: PriceCalculationOptions = {},
): AverageResult {
  const shippingMode = options.shippingMode ?? DEFAULT_SHIPPING_MODE;
  const currency = options.currency ?? DEFAULT_CURRENCY;

  const { qualifying, excluded } = filterQualifyingSales(sales, {
    ...options,
    currency,
    shippingMode,
  });

  const salesAvailable = qualifying.length;

  if (salesAvailable === 0) {
    return insufficient(options, maxSales, excluded);
  }

  const sorted = [...qualifying].sort(
    (a, b) => b.saleDate.getTime() - a.saleDate.getTime(),
  );

  const selected: Sale[] = [];
  for (const sale of sorted) {
    if (selected.length >= maxSales) break;
    const amount = saleAmount(sale, shippingMode);
    if (amount === null) {
      excluded.push({ sale, reason: "INVALID_PRICE" });
      continue;
    }
    selected.push(sale);
  }

  const usedSales: UsedSale[] = [];
  const amounts: string[] = [];

  for (const sale of selected) {
    const amount = saleAmount(sale, shippingMode);
    if (amount === null) continue;
    const effective = toMoneyNumber(amount);
    usedSales.push({ sale, effectivePrice: effective });
    amounts.push(amount.toFixed(2));
  }

  if (usedSales.length === 0) {
    return insufficient(options, maxSales, excluded);
  }

  const mean = meanMoney(amounts);
  const median = medianMoney(amounts);
  const minimum = minMoney(amounts);
  const maximum = maxMoney(amounts);

  const dates = usedSales.map((u) => u.sale.saleDate);
  const newestSaleDate = dates.reduce((a, b) => (a > b ? a : b));
  const oldestSaleDate = dates.reduce((a, b) => (a < b ? a : b));

  return {
    average: mean === null ? null : toMoneyNumber(mean),
    median: median === null ? null : toMoneyNumber(median),
    minimum: minimum === null ? null : toMoneyNumber(minimum),
    maximum: maximum === null ? null : toMoneyNumber(maximum),
    salesUsed: usedSales.length,
    salesAvailable,
    oldestSaleDate,
    newestSaleDate,
    status: "CALCULATED",
    currency,
    shippingMode,
    maxSales,
    usedSales,
    excludedSales: excluded,
  };
}
