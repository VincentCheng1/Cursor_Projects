import Decimal from "decimal.js";

import { tryToDecimal } from "../money";
import type { Sale } from "../types/sale";
import type { ShippingMode } from "../types/calculation";

/**
 * Resolves the single amount a sale contributes to an average (spec §19).
 *
 * The mode is chosen once per calculation and applied to every sale in the set,
 * so one average never mixes sale-only and sale-plus-shipping figures.
 *
 * - `SALE_PRICE_ONLY`    → salePrice
 * - `SALE_PLUS_SHIPPING` → the provider's totalPrice when it already includes
 *                          shipping, else salePrice + shippingPrice, else
 *                          salePrice when shipping is unknown.
 *
 * Shipping is never added twice: a `totalPrice` at or above `salePrice` is taken
 * as already inclusive and `shippingPrice` is not re-applied.
 */
export function saleAmount(sale: Sale, mode: ShippingMode): Decimal | null {
  const salePrice = tryToDecimal(sale.salePrice);
  if (salePrice === null || salePrice.isNegative()) return null;

  if (mode === "SALE_PRICE_ONLY") return salePrice;

  const total = tryToDecimal(sale.totalPrice);
  if (total !== null && total.greaterThanOrEqualTo(salePrice)) {
    return total;
  }

  const shipping = tryToDecimal(sale.shippingPrice);
  if (shipping === null || shipping.isNegative()) return salePrice;

  return salePrice.plus(shipping);
}
