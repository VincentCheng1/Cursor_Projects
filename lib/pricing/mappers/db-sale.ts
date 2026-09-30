import type { Sale as DbSale } from "@/lib/db/generated/client";

import {
  listingConfirmsCardIdentity,
  listingConfirmsVariantIdentity,
} from "../normalizer/attributeListing";
import { detectMultiCardLot } from "../normalizer/detectLot";
import { normalizeText } from "../normalizer/text";
import type { Sale } from "../types/sale";

/**
 * Optional pricing-request context used to re-prove an eBay variant stamp from
 * the listing title. Sale rows do not persist variantName/printing, so remap
 * can only keep a stored variantId when the caller supplies those phrases and
 * the title evidences them (spec §16 — no invented attribution).
 */
export type DbSaleRemapContext = {
  variantId?: string;
  variantName?: string;
  printing?: string | null;
};

/**
 * Maps a persisted marketplace sale into the pricing engine shape.
 *
 * eBay rows historically stamped the *requested* CardVault identity onto keyword
 * hits. At read time we re-check listing evidence and strip forged identity so
 * poisoned rows cannot enter averages (spec §16).
 */
export function mapDbSaleToPricingSale(
  row: DbSale,
  expected?: DbSaleRemapContext,
): Sale {
  const copiesCovered = row.copiesCovered ?? undefined;
  const isLot = row.isLot === true || detectMultiCardLot(row.listingTitle);

  const base: Sale = {
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
    copiesCovered: copiesCovered ?? (isLot ? undefined : 1),
    isLot: isLot || undefined,
  };

  if (row.source !== "EBAY") {
    return base;
  }

  const confirmed = listingConfirmsCardIdentity(row.listingTitle, {
    cardName: row.cardName ?? undefined,
    setName: row.setName ?? undefined,
    cardNumber: row.cardNumber ?? undefined,
  });

  if (!confirmed) {
    return {
      ...base,
      cardId: undefined,
      variantId: undefined,
      game: undefined,
      cardName: undefined,
      setName: undefined,
      cardNumber: undefined,
    };
  }

  const storedVariantId = row.variantId?.trim() || undefined;
  const expectedVariantId = expected?.variantId?.trim() || undefined;
  const variantName = expected?.variantName;
  const printing = expected?.printing ?? undefined;
  const hasVariantPhrases =
    normalizeText(variantName) !== undefined || normalizeText(printing) !== undefined;

  // Re-prove the stored variant against title phrases from the pricing request.
  // Prefer under-inclusion: no phrases / id mismatch / silent title → drop.
  if (
    storedVariantId !== undefined &&
    expectedVariantId !== undefined &&
    storedVariantId === expectedVariantId &&
    hasVariantPhrases &&
    listingConfirmsVariantIdentity(row.listingTitle, { variantName, printing })
  ) {
    return {
      ...base,
      variantId: expectedVariantId,
      variantName,
      printing,
    };
  }

  return { ...base, variantId: undefined };
}
