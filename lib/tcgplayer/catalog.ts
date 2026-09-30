import { tcgplayerRequest } from "./http";

export interface TcgCategoryRow {
  categoryId?: number;
  name?: string;
  displayName?: string;
  parentCategoryId?: number | null;
}

export interface TcgGroupRow {
  groupId?: number;
  name?: string;
  abbreviation?: string;
  publishedOn?: string | null;
  modifiedOn?: string | null;
  categoryId?: number;
  isSupplemental?: boolean;
}

export interface TcgProductRow {
  productId?: number;
  name?: string;
  cleanName?: string;
  imageUrl?: string;
  groupId?: number;
  groupName?: string;
  categoryId?: number;
  number?: string;
  rarityName?: string;
  rarity?: string;
  extendedData?: Array<{ name?: string; value?: string }>;
}

export interface TcgSkuRow {
  skuId?: number;
  productId?: number;
  languageId?: number;
  languageName?: string;
  printingId?: number;
  printingName?: string;
  conditionId?: number;
  conditionName?: string;
}

interface Paged<T> {
  results?: T[];
  totalItems?: number;
}

const PAGE_SIZE = 100;

/** Exhaustive category list from authorized Catalog API. */
export async function tcgplayerListCategories(): Promise<TcgCategoryRow[]> {
  const data = await tcgplayerRequest<Paged<TcgCategoryRow>>(
    "listCategories",
    "/catalog/categories?limit=100&offset=0",
  );
  return data.results ?? [];
}

/** Exhaust all groups (sets) for a category via offset pagination. */
export async function tcgplayerListGroupsForCategory(
  categoryId: string,
  options?: { offset?: number; limit?: number },
): Promise<{ items: TcgGroupRow[]; totalItems: number; nextOffset: number | null }> {
  const limit = options?.limit ?? PAGE_SIZE;
  const offset = options?.offset ?? 0;
  const params = new URLSearchParams({
    categoryId,
    limit: String(limit),
    offset: String(offset),
  });
  const data = await tcgplayerRequest<Paged<TcgGroupRow>>(
    "listSets",
    `/catalog/groups?${params}`,
  );
  const items = data.results ?? [];
  const totalItems = data.totalItems ?? items.length;
  const nextOffset = offset + items.length < totalItems ? offset + items.length : null;
  return { items, totalItems, nextOffset };
}

/** Exhaust products for a group (set). */
export async function tcgplayerListProductsForGroup(
  groupId: string,
  options?: { offset?: number; limit?: number },
): Promise<{ items: TcgProductRow[]; totalItems: number; nextOffset: number | null }> {
  const limit = options?.limit ?? PAGE_SIZE;
  const offset = options?.offset ?? 0;
  const params = new URLSearchParams({
    groupId,
    limit: String(limit),
    offset: String(offset),
    getExtendedFields: "true",
  });
  const data = await tcgplayerRequest<Paged<TcgProductRow>>(
    "listProducts",
    `/catalog/products?${params}`,
  );
  const items = data.results ?? [];
  const totalItems = data.totalItems ?? items.length;
  const nextOffset = offset + items.length < totalItems ? offset + items.length : null;
  return { items, totalItems, nextOffset };
}

export async function tcgplayerGetProductDetails(productId: string): Promise<TcgProductRow | null> {
  const data = await tcgplayerRequest<Paged<TcgProductRow>>(
    "getProduct",
    `/catalog/products/${productId}?getExtendedFields=true`,
  );
  return data.results?.[0] ?? null;
}

export async function tcgplayerListSkus(productId: string): Promise<TcgSkuRow[]> {
  const data = await tcgplayerRequest<Paged<TcgSkuRow>>(
    "listVariants",
    `/catalog/products/${productId}/skus`,
  );
  return data.results ?? [];
}

/**
 * Optional reference list/market prices — never used as CardVault calculated value (§2).
 * Returns null when the credential tier does not expose pricing.
 */
export async function tcgplayerGetMarketPrice(
  productId: string,
): Promise<number | null> {
  try {
    const data = await tcgplayerRequest<{
      results?: Array<{ marketPrice?: number | null; midPrice?: number | null }>;
    }>("getMarketPrice", `/pricing/product/${productId}`);
    const row = data.results?.[0];
    const price = row?.marketPrice ?? row?.midPrice;
    return typeof price === "number" && Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}
