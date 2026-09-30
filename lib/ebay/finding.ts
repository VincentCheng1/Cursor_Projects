import { logProviderRequest } from "@/lib/logging/provider-logger";
import { waitForProviderSlot } from "@/lib/pricing/providers/rate-limit";
import type { CardIdentifier } from "@/lib/pricing/types/card";
import type { SalesQueryOptions } from "@/lib/pricing/types/provider";
import type { Sale } from "@/lib/pricing/types/sale";
import { normalizeEbaySale, type EbaySoldItemRecord } from "@/lib/pricing/normalizer/normalizeSale";
import {
  EBAY_MAX_FETCH_PAGES,
  filterSalesByQueryOptions,
  takeRecentSales,
} from "@/lib/pricing/services/sale-query";

import { ebayFindingBase } from "./config";

function buildKeywords(card: CardIdentifier): string {
  const parts = [
    card.cardName,
    card.setName,
    card.cardNumber,
    card.variantName,
  ].filter(Boolean);
  return parts.join(" ");
}

/**
 * Completed listings via eBay Finding API `findCompletedItems` (spec §14).
 * Active listings are never requested.
 *
 * Pages until enough rows match the sales-query filters (condition/grading/…)
 * or pages are exhausted — filter before the caller limit.
 */
export async function ebayFindCompletedSales(
  card: CardIdentifier,
  options: SalesQueryOptions,
): Promise<Sale[]> {
  const keywords = buildKeywords(card);
  if (keywords.trim() === "") return [];

  const qualifyingLimit = options.limit ?? 50;
  const pageSize = 100;
  const collected: Sale[] = [];

  for (let page = 1; page <= EBAY_MAX_FETCH_PAGES; page += 1) {
    const pageSales = await fetchFindingPage(card, keywords, page, pageSize);
    if (pageSales.length === 0) break;
    collected.push(...pageSales);

    const matching = filterSalesByQueryOptions(collected, options);
    if (matching.length >= qualifyingLimit) {
      return takeRecentSales(matching, qualifyingLimit);
    }
    // Finding returns fewer than a full page → no further pages.
    if (pageSales.length < pageSize) break;
  }

  return takeRecentSales(filterSalesByQueryOptions(collected, options), qualifyingLimit);
}

async function fetchFindingPage(
  card: CardIdentifier,
  keywords: string,
  pageNumber: number,
  entriesPerPage: number,
): Promise<Sale[]> {
  await waitForProviderSlot("EBAY");
  const started = Date.now();

  const params = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.13.0",
    "SECURITY-APPNAME": process.env.EBAY_CLIENT_ID!,
    "RESPONSE-DATA-FORMAT": "JSON",
    "REST-PAYLOAD": "",
    keywords,
    "paginationInput.entriesPerPage": String(entriesPerPage),
    "paginationInput.pageNumber": String(pageNumber),
    "itemFilter(0).name": "SoldItemsOnly",
    "itemFilter(0).value": "true",
  });

  const url = `${ebayFindingBase()}?${params}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    logProviderRequest({
      provider: "EBAY",
      operation: "findCompletedItems",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      success: false,
      errorCode: String(res.status),
    });
    throw new Error(`eBay findCompletedItems failed (${res.status})`);
  }

  const json = (await res.json()) as {
    findCompletedItemsResponse?: Array<{
      searchResult?: Array<{
        item?: EbayFindingItem[];
      }>;
    }>;
  };

  const items =
    json.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];

  logProviderRequest({
    provider: "EBAY",
    operation: "findCompletedItems",
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - started,
    success: true,
    recordsReturned: items.length,
  });

  return items
    .map((item) => mapFindingItemToSale(item, card))
    .filter((s): s is Sale => s !== null);
}

interface EbayFindingItem {
  itemId?: string[];
  title?: string[];
  globalId?: string[];
  galleryURL?: string[];
  viewItemURL?: string[];
  sellingStatus?: Array<{
    currentPrice?: Array<{ __value__?: string; "@currencyId"?: string }>;
    convertedCurrentPrice?: Array<{ __value__?: string }>;
  }>;
  listingInfo?: Array<{ endTime?: string[] }>;
  condition?: Array<{ conditionDisplayName?: string[] }>;
  shippingInfo?: Array<{
    shippingServiceCost?: Array<{ __value__?: string }>;
  }>;
}

function mapFindingItemToSale(item: EbayFindingItem, card: CardIdentifier): Sale | null {
  const record: EbaySoldItemRecord = {
    itemId: item.itemId?.[0] ?? null,
    title: item.title?.[0] ?? null,
    itemWebUrl: item.viewItemURL?.[0] ?? null,
    image: { imageUrl: item.galleryURL?.[0] ?? null },
    condition: item.condition?.[0]?.conditionDisplayName?.[0] ?? null,
    price: {
      value: item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? null,
      currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.["@currencyId"] ?? "USD",
    },
    shippingCost: {
      value: item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ ?? null,
    },
    lastSoldDate: item.listingInfo?.[0]?.endTime?.[0] ?? null,
  };

  return normalizeEbaySale(record, {
    cardId: card.cardId,
    variantId: card.variantId,
    game: card.game,
    cardName: card.cardName,
    setName: card.setName,
    setCode: card.setCode,
    cardNumber: card.cardNumber,
    variantName: card.variantName,
    printing: card.printing,
    language: card.language,
  });
}
