import { ebayRequest } from "@/lib/ebay/http";

export interface EbayBrowseItemSummary {
  itemId?: string;
  title?: string;
  leafCategoryIds?: string[];
  epid?: string;
  itemAffiliateWebUrl?: string;
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  localizedAspects?: Array<{ name?: string; value?: string }>;
}

interface BrowseSearchResponse {
  href?: string;
  total?: number;
  next?: string;
  itemSummaries?: EbayBrowseItemSummary[];
}

/**
 * Authorized Browse API item_summary search — public listing metadata only.
 * Never treats active listings as completed sales (spec §14).
 */
export async function ebayBrowseSearch(input: {
  q: string;
  categoryIds?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ items: EbayBrowseItemSummary[]; total: number; nextOffset: number | null }> {
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;
  const params = new URLSearchParams({
    q: input.q,
    limit: String(limit),
    offset: String(offset),
  });
  if (input.categoryIds !== undefined && input.categoryIds.length > 0) {
    params.set("category_ids", input.categoryIds.join(","));
  }

  const data = await ebayRequest<BrowseSearchResponse>(
    "browseSearch",
    `/buy/browse/v1/item_summary/search?${params}`,
  );

  const items = data.itemSummaries ?? [];
  const total = data.total ?? items.length;
  const nextOffset = offset + items.length < total ? offset + items.length : null;
  return { items, total, nextOffset };
}

export function extractEbayProductLink(item: EbayBrowseItemSummary): string | null {
  if (item.epid !== undefined && item.epid !== "") return item.epid;
  if (item.itemId !== undefined && item.itemId !== "") return item.itemId;
  return null;
}

export function aspectValue(
  item: EbayBrowseItemSummary,
  names: string[],
): string | null {
  const aspects = item.localizedAspects ?? [];
  for (const want of names) {
    const hit = aspects.find((a) => a.name?.toLowerCase() === want.toLowerCase());
    if (hit?.value) return hit.value;
  }
  return null;
}
