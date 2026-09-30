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
 * - `SALE_PLUS_SHIPPING` → salePrice + shippingPrice when shipping is known;
 *                          a provider `totalPrice` is used only when it is at
 *                          least sale+shipping (already inclusive). If
 *                          `totalPrice === salePrice` but shipping is set, the
 *                          total is treated as non-inclusive and shipping is
 *                          added. When shipping is unknown, fall back to
 *                          totalPrice (if ≥ salePrice) or salePrice.
 *
 * Shipping is never added twice.
 */
export function saleAmount(sale: Sale, mode: ShippingMode): Decimal | null {
  const salePrice = tryToDecimal(sale.salePrice);
  if (salePrice === null || salePrice.isNegative()) return null;

  if (mode === "SALE_PRICE_ONLY") return salePrice;

  const total = tryToDecimal(sale.totalPrice);
  const shipping = tryToDecimal(sale.shippingPrice);

  if (shipping !== null && !shipping.isNegative()) {
    const salePlusShipping = salePrice.plus(shipping);
    // Only trust total as inclusive when it covers sale + shipping.
    if (total !== null && total.greaterThanOrEqualTo(salePlusShipping)) {
      return total;
    }
    return salePlusShipping;
  }

  if (total !== null && total.greaterThanOrEqualTo(salePrice)) {
    return total;
  }

  return salePrice;
}
