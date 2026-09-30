import { tcgcsvRequestJson, tcgcsvRequestText } from "./http";
import { normalizeTcgCsvPriceRow, parseTcgCsvPricesCsv, pickExtendedField } from "./parse";
import type {
  TcgCsvCategory,
  TcgCsvCollection,
  TcgCsvGroup,
  TcgCsvPrice,
  TcgCsvProduct,
  TcgCsvReferencePrice,
} from "./types";

export async function tcgcsvFetchLastUpdated(): Promise<string> {
  const text = await tcgcsvRequestText("lastUpdated", "/last-updated.txt");
  return text.trim();
}

export async function tcgcsvListCategories(): Promise<TcgCsvCategory[]> {
  const data = await tcgcsvRequestJson<TcgCsvCollection<TcgCsvCategory>>(
    "listCategories",
    "/tcgplayer/categories",
  );
  return data.results ?? [];
}

export async function tcgcsvListGroups(categoryId: string): Promise<TcgCsvGroup[]> {
  const data = await tcgcsvRequestJson<TcgCsvCollection<TcgCsvGroup>>(
    "listGroups",
    `/tcgplayer/${encodeURIComponent(categoryId)}/groups`,
  );
  return data.results ?? [];
}

export async function tcgcsvListProducts(
  categoryId: string,
  groupId: string,
): Promise<TcgCsvProduct[]> {
  const data = await tcgcsvRequestJson<TcgCsvCollection<TcgCsvProduct>>(
    "listProducts",
    `/tcgplayer/${encodeURIComponent(categoryId)}/${encodeURIComponent(groupId)}/products`,
  );
  return data.results ?? [];
}

export async function tcgcsvListPrices(
  categoryId: string,
  groupId: string,
): Promise<TcgCsvReferencePrice[]> {
  const data = await tcgcsvRequestJson<TcgCsvCollection<TcgCsvPrice>>(
    "listPrices",
    `/tcgplayer/${encodeURIComponent(categoryId)}/${encodeURIComponent(groupId)}/prices`,
  );
  return (data.results ?? [])
    .map((row) => normalizeTcgCsvPriceRow(row))
    .filter((r): r is TcgCsvReferencePrice => r !== null);
}

/** Optional CSV path — same fields as JSON prices; used for fixtures / offline sync. */
export async function tcgcsvListPricesCsv(
  categoryId: string,
  groupId: string,
): Promise<TcgCsvReferencePrice[]> {
  // ProductsAndPrices.csv joins product+price; dedicated Prices.csv is not always present.
  // Prefer JSON. This helper fetches ProductsAndPrices.csv when callers need CSV.
  const text = await tcgcsvRequestText(
    "listPricesCsv",
    `/tcgplayer/${encodeURIComponent(categoryId)}/${encodeURIComponent(groupId)}/ProductsAndPrices.csv`,
  );
  return parseTcgCsvPricesCsv(text);
}

export function tcgcsvProductCardNumber(product: TcgCsvProduct): string | null {
  return pickExtendedField(product, ["number", "card number"]);
}

export function tcgcsvProductRarity(product: TcgCsvProduct): string | null {
  return pickExtendedField(product, ["rarity"]);
}
