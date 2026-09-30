import Decimal from "decimal.js";

import { toMoneyNumber, tryToDecimal } from "../money";

export interface CollectionItemValueInput {
  quantity: number;
  /** Combined §22 value for this item's exact card/variant/condition/grade. */
  currentCardValue: number | null;
  purchasePrice?: number | string | null;
}

/**
 * Item value from combined headline price (spec §23). Null pricing → 0 contribution.
 */
export function calculateItemValue(item: CollectionItemValueInput): number {
  if (item.currentCardValue === null) return 0;
  const qty = new Decimal(item.quantity);
  const value = new Decimal(item.currentCardValue);
  return toMoneyNumber(qty.times(value));
}

export function calculateCollectionValue(items: CollectionItemValueInput[]): number {
  const total = items.reduce(
    (sum, item) => sum.plus(calculateItemValue(item)),
    new Decimal(0),
  );
  return toMoneyNumber(total);
}

export function calculateTotalCost(items: CollectionItemValueInput[]): number {
  let total = new Decimal(0);
  for (const item of items) {
    const price = tryToDecimal(item.purchasePrice ?? 0);
    if (price === null || price.isNegative()) continue;
    total = total.plus(price.times(item.quantity));
  }
  return toMoneyNumber(total);
}

export function calculateProfit(collectionValue: number, totalCost: number): number {
  return toMoneyNumber(new Decimal(collectionValue).minus(totalCost));
}

export function calculateROI(collectionValue: number, totalCost: number): number | null {
  if (totalCost === 0) return null;
  const profit = new Decimal(collectionValue).minus(totalCost);
  const roi = profit.dividedBy(totalCost).times(100);
  return toMoneyNumber(roi);
}
