import type { CardIdentifier } from "@/lib/pricing/types/card";
import type { SalesQueryOptions } from "@/lib/pricing/types/provider";
import type { Sale } from "@/lib/pricing/types/sale";
import {
  normalizeEbaySale,
  type EbaySoldItemRecord,
} from "@/lib/pricing/normalizer/normalizeSale";
import {
  EBAY_MAX_FETCH_PAGES,
  filterSalesByQueryOptions,
  takeRecentSales,
} from "@/lib/pricing/services/sale-query";

import { tcaEbayPlatformParam } from "./config";
import { tcaGetJson } from "./http";
import type { TcaSaleRecord, TcaSalesResponse } from "./types";

/** Max pages via cursor when oversampling for condition/grade filters. */
const TCA_MAX_PAGES = EBAY_MAX_FETCH_PAGES;

/**
 * Build a full-text `q` for The Card API.
 * Docs require min 4 characters; return null when the identity is too thin.
 */
export function buildTcaSalesQuery(card: CardIdentifier): string | null {
  const parts = [card.cardName, card.setName, card.cardNumber, card.variantName].filter(
    (p): p is string => typeof p === "string" && p.trim() !== "",
  );
  const q = parts.join(" ").trim();
  if (q.length < 4) return null;
  return q;
}

/** True when the sale row is a completed eBay transaction we may map to EBAY Sales.
 *
 * Gate (review P0): platform eBay + sale amount + sale date/timestamp.
 * Catalog / market-only / listing-without-sold fields must fail this check —
 * never invent Sale rows from has_price or asking prices.
 */
export function isTcaEbayCompletedSale(row: TcaSaleRecord): boolean {
  if (typeof row.platform !== "string") return false;
  if (row.platform.trim().toLowerCase() !== "ebay") return false;
  if (row.price === null || row.price === undefined || row.price === "") return false;
  const when = row.sold_at ?? row.sale_date;
  if (when === null || when === undefined || String(when).trim() === "") return false;
  return true;
}

/**
 * Map a TCA Market sale into the existing eBay sold-item normalizer input.
 * Only call after `isTcaEbayCompletedSale` — never invent prices or dates.
 */
export function tcaSaleToEbayRecord(row: TcaSaleRecord): EbaySoldItemRecord {
  return {
    itemId: row.id,
    title: row.title,
    itemWebUrl: row.listing_url,
    image: { imageUrl: row.image_url ?? row.thumbnail_url },
    condition: row.condition,
    price: {
      value: row.price,
      currency: row.currency ?? "USD",
    },
    shippingCost:
      row.shipping_price === null || row.shipping_price === undefined
        ? undefined
        : { value: row.shipping_price, currency: row.currency ?? "USD" },
    lastSoldDate: row.sold_at ?? row.sale_date,
    gradingCompany: row.grader ?? row.grading_company,
    grade: row.grade,
  };
}

export function normalizeTcaEbaySale(
  row: TcaSaleRecord,
  card: CardIdentifier,
): Sale | null {
  if (!isTcaEbayCompletedSale(row)) return null;
  return normalizeEbaySale(tcaSaleToEbayRecord(row), card);
}

/**
 * Fetch completed eBay sales from The Card API for a card identity.
 * Filters qualifying rows before the caller limit (spec §3 / §18).
 * Throws on API failure — callers must fail closed (no invented sales).
 */
export async function tcaFindCompletedEbaySales(
  card: CardIdentifier,
  options: SalesQueryOptions,
): Promise<Sale[]> {
  const q = buildTcaSalesQuery(card);
  if (q === null) return [];

  const qualifyingLimit = options.limit ?? 50;
  const pageSize = Math.min(100, Math.max(qualifyingLimit, 25));
  const collected: Sale[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < TCA_MAX_PAGES; page += 1) {
    const query: Record<string, string | number | boolean | undefined> = {
      q,
      platform: tcaEbayPlatformParam(),
      limit: pageSize,
      sort: "date_desc",
    };
    if (options.since !== undefined) {
      query.date_from = options.since.toISOString().slice(0, 10);
    }
    if (cursor !== undefined) {
      query.cursor = cursor;
    }

    const response = await tcaGetJson<TcaSalesResponse>({
      operation: "market.sales",
      path: "/sales",
      query,
    });

    const rows = Array.isArray(response.data) ? response.data : [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const sale = normalizeTcaEbaySale(row, card);
      if (sale !== null) collected.push(sale);
    }

    const matching = filterSalesByQueryOptions(collected, options);
    if (matching.length >= qualifyingLimit) {
      return takeRecentSales(matching, qualifyingLimit);
    }

    const next = response.pagination?.next_cursor;
    if (next === null || next === undefined || next === "") break;
    cursor = next;
  }

  return takeRecentSales(filterSalesByQueryOptions(collected, options), qualifyingLimit);
}
