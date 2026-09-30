import { createHash } from "node:crypto";

import { toMoneyString, tryToDecimal } from "../money";
import { normalizeCardNumber, normalizeText } from "../normalizer/text";
import type { Sale } from "../types/sale";

/**
 * Stable duplicate key for a sale (spec §17).
 *
 * Preferred key is `source + externalSaleId`. When the source gives no id, a
 * fingerprint over source, card, sale date, sale price, listing title and
 * seller stands in — the same transaction surfacing twice produces the same
 * fingerprint, so it is only counted once.
 */
export function saleFingerprint(sale: Sale): string {
  const price = tryToDecimal(sale.salePrice);

  const parts = [
    sale.source,
    sale.cardId ?? "",
    sale.variantId ?? "",
    normalizeText(sale.cardName) ?? "",
    normalizeText(sale.setName) ?? "",
    normalizeCardNumber(sale.cardNumber) ?? "",
    sale.saleDate instanceof Date && !Number.isNaN(sale.saleDate.getTime())
      ? sale.saleDate.toISOString()
      : "",
    price === null ? "" : toMoneyString(price),
    sale.currency ?? "",
    normalizeText(sale.listingTitle) ?? "",
    normalizeText(sale.sellerName) ?? "",
  ];

  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

export function saleDuplicateKey(sale: Sale): string {
  const externalId = sale.externalSaleId?.trim();
  if (externalId !== undefined && externalId !== "") {
    return `${sale.source}::id::${externalId}`;
  }
  return `${sale.source}::fp::${saleFingerprint(sale)}`;
}

/**
 * Removes repeated transactions, keeping the first occurrence of each.
 *
 * Runs across the whole pool it is given — including a pool assembled from
 * several sources (spec §22), since one transaction can surface from more than one.
 */
export function deduplicateSales(sales: Sale[]): Sale[] {
  const seen = new Set<string>();
  const unique: Sale[] = [];

  for (const sale of sales) {
    const key = saleDuplicateKey(sale);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(sale);
  }

  return unique;
}

/** Same pass as `deduplicateSales`, but reports what was dropped. */
export function partitionDuplicates(sales: Sale[]): { unique: Sale[]; duplicates: Sale[] } {
  const seen = new Set<string>();
  const unique: Sale[] = [];
  const duplicates: Sale[] = [];

  for (const sale of sales) {
    const key = saleDuplicateKey(sale);
    if (seen.has(key)) {
      duplicates.push(sale);
      continue;
    }
    seen.add(key);
    unique.push(sale);
  }

  return { unique, duplicates };
}
