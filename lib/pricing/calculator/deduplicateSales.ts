import { createHash } from "node:crypto";

import { toMoneyString, tryToDecimal } from "../money";
import { normalizeCardNumber, normalizeText } from "../normalizer/text";
import type { Sale } from "../types/sale";

/**
 * Source-agnostic content fingerprint for a sale (spec §17 / §22).
 *
 * Omits `source` so the same completed transaction ingested from TCGplayer and
 * eBay (same card, date, price, title, seller) collapses to one row in a pooled
 * calculation. Marketplace ids are handled separately via `saleIdentityKeys`.
 */
export function saleFingerprint(sale: Sale): string {
  const price = tryToDecimal(sale.salePrice);

  const parts = [
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

/**
 * Identity keys used for dedupe.
 *
 * - Content fingerprint (always) — catches the same transaction across sources.
 * - `source + externalSaleId` when present — preferred within-source key (§17).
 */
export function saleIdentityKeys(sale: Sale): string[] {
  const keys = [`fp::${saleFingerprint(sale)}`];
  const externalId = sale.externalSaleId?.trim();
  if (externalId !== undefined && externalId !== "") {
    keys.push(`${sale.source}::id::${externalId}`);
  }
  return keys;
}

/** Primary display/debug key; prefers source+externalSaleId when available. */
export function saleDuplicateKey(sale: Sale): string {
  const keys = saleIdentityKeys(sale);
  return keys[keys.length - 1] ?? keys[0]!;
}

function isDuplicateOfSeen(sale: Sale, seen: Set<string>): boolean {
  return saleIdentityKeys(sale).some((key) => seen.has(key));
}

function markSeen(sale: Sale, seen: Set<string>): void {
  for (const key of saleIdentityKeys(sale)) {
    seen.add(key);
  }
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
    if (isDuplicateOfSeen(sale, seen)) continue;
    markSeen(sale, seen);
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
    if (isDuplicateOfSeen(sale, seen)) {
      duplicates.push(sale);
      continue;
    }
    markSeen(sale, seen);
    unique.push(sale);
  }

  return { unique, duplicates };
}
