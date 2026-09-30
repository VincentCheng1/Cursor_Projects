import type { Sale as DbSale } from "@/lib/db/generated/client";

import type { Sale } from "../types/sale";

/** Maps a persisted marketplace sale into the pricing engine shape. */
export function mapDbSaleToPricingSale(row: DbSale): Sale {
  return {
    source: row.source,
    externalSaleId: row.externalSaleId ?? undefined,
    cardId: row.cardId ?? undefined,
    variantId: row.variantId ?? undefined,
    game: row.game ?? undefined,
    cardName: row.cardName ?? undefined,
    setName: row.setName ?? undefined,
    cardNumber: row.cardNumber ?? undefined,
    condition: row.condition ?? undefined,
    language: row.language ?? undefined,
    gradingCompany: row.gradingCompany ?? undefined,
    grade: row.grade ?? undefined,
    salePrice: row.salePrice.toString(),
    shippingPrice: row.shippingPrice?.toString(),
    totalPrice: row.totalPrice?.toString(),
    currency: row.currency,
    saleDate: row.saleDate,
    listingTitle: row.listingTitle ?? undefined,
    listingUrl: row.listingUrl ?? undefined,
    sellerName: row.sellerName ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    rawData: row.rawData,
    copiesCovered: 1,
  };
}
