import type { CardSearchOptions } from "@/lib/pricing/types/provider";
import type { SalesQueryOptions } from "@/lib/pricing/types/provider";
import type { CardIdentifier } from "@/lib/pricing/types/card";
import type { Sale } from "@/lib/pricing/types/sale";
import {
  normalizeTCGPlayerSale,
  type TCGPlayerSalesHistoryRecord,
} from "@/lib/pricing/normalizer/normalizeSale";

import { tcgplayerRequest } from "./http";
import { tcgplayerSalesHistoryUrl } from "./config";

interface TcgSearchResponse {
  results?: Array<{
    productId?: number;
    name?: string;
    cleanName?: string;
    imageUrl?: string;
    groupName?: string;
    number?: string;
    rarity?: string;
  }>;
  totalItems?: number;
}

interface TcgProductResponse {
  results?: Array<{
    productId?: number;
    name?: string;
    cleanName?: string;
    imageUrl?: string;
    groupName?: string;
    number?: string;
    rarity?: string;
  }>;
}

export async function tcgplayerSearchProducts(query: string, options?: CardSearchOptions) {
  const params = new URLSearchParams({
    productName: query,
    limit: String(options?.limit ?? 25),
    offset: String(options?.offset ?? 0),
  });
  if (options?.setName) params.set("setName", options.setName);

  const data = await tcgplayerRequest<TcgSearchResponse>(
    "searchCards",
    `/catalog/products?${params}`,
  );
  return data.results ?? [];
}

export async function tcgplayerGetProduct(productId: string) {
  const data = await tcgplayerRequest<TcgProductResponse>(
    "getCard",
    `/catalog/products/${productId}`,
  );
  return data.results?.[0] ?? null;
}

/**
 * Fetches sales-history rows from authorized TCGplayer endpoints only.
 * Returns an empty array when no sales URL is configured or the API returns no rows.
 */
export async function tcgplayerFetchSalesHistory(
  productId: string,
  card: CardIdentifier,
  _options: SalesQueryOptions,
): Promise<Sale[]> {
  const customUrl = tcgplayerSalesHistoryUrl(productId);
  if (customUrl !== null) {
    try {
      const payload = await tcgplayerRequest<{ results?: TCGPlayerSalesHistoryRecord[] } | TCGPlayerSalesHistoryRecord[]>(
        "getRecentSales",
        customUrl,
      );
      const rows = Array.isArray(payload) ? payload : payload.results ?? [];
      return rows
        .map((row) =>
          normalizeTCGPlayerSale(row, {
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
          }),
        )
        .filter((s): s is Sale => s !== null);
    } catch {
      return [];
    }
  }

  // Standard pricing route — returns recent completed sales when the credential tier exposes them.
  try {
    const data = await tcgplayerRequest<{
      results?: TCGPlayerSalesHistoryRecord[];
    }>("getRecentSales", `/pricing/product/${productId}/sales`);
    const rows = data.results ?? [];
    return rows
      .map((row) =>
        normalizeTCGPlayerSale(row, {
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
        }),
      )
      .filter((s): s is Sale => s !== null);
  } catch {
    return [];
  }
}
