import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";
import {
  GAME_CATEGORY_NAME_HINTS,
  tcgplayerCategoryMapFromEnv,
} from "@/lib/tcgplayer/category-map";
import {
  tcgcsvListCategories,
  tcgcsvListGroups,
  tcgcsvListPrices,
  tcgcsvListProducts,
  tcgcsvProductCardNumber,
  tcgcsvProductRarity,
} from "@/lib/tcgcsv/client";
import { tcgcsvIsEnabled } from "@/lib/tcgcsv/config";
import { mapSubTypeToVariantHints, pickReferenceUnitPrice } from "@/lib/tcgcsv/parse";
import type { TcgCsvProduct } from "@/lib/tcgcsv/types";

import type {
  CatalogCategory,
  CatalogListOptions,
  CatalogPage,
  CatalogProduct,
  CatalogProvider,
  CatalogSet,
  CatalogVariant,
} from "../types";

function matchGameSlug(categoryName: string): string | undefined {
  const lower = categoryName.toLowerCase();
  for (const [slug, hints] of Object.entries(GAME_CATEGORY_NAME_HINTS)) {
    if (hints.some((h) => lower.includes(h))) return slug;
  }
  return undefined;
}

function mapProduct(
  row: TcgCsvProduct,
  gameSlug: string | undefined,
  referenceMarketPrice: number | null,
  variants: CatalogVariant[],
): CatalogProduct {
  return {
    externalProductId: String(row.productId),
    externalSetId: row.groupId !== undefined ? String(row.groupId) : undefined,
    name: row.name ?? row.cleanName ?? "Unknown",
    cardNumber: tcgcsvProductCardNumber(row),
    rarity: tcgcsvProductRarity(row),
    imageUrl: row.imageUrl ?? null,
    gameSlug,
    variants,
    referenceMarketPrice,
    raw: row,
  };
}

/**
 * Public TCGCSV catalog provider — daily cached TCGplayer categories / groups /
 * products / market prices from https://tcgcsv.com (no API secrets).
 *
 * Occupies the TCGPLAYER catalog slot when enabled. Does **not** invent cards;
 * empty or failed fetches fail closed. Market prices are reference-only (§2).
 */
export class TcgCsvCatalogProvider implements CatalogProvider {
  readonly id = "TCGPLAYER" as const;
  readonly displayName = "TCGCSV (TCGplayer public cache)";

  isConfigured(): boolean {
    return tcgcsvIsEnabled();
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError("TCGCSV");
    }
  }

  async listCategories(_options?: CatalogListOptions): Promise<CatalogPage<CatalogCategory>> {
    this.assertConfigured();
    const envMap = tcgplayerCategoryMapFromEnv();
    const rows = await tcgcsvListCategories();
    const items: CatalogCategory[] = rows
      .filter((r) => Number.isFinite(r.categoryId))
      .map((r) => {
        const name = r.displayName ?? r.name ?? `Category ${r.categoryId}`;
        const byName = matchGameSlug(name);
        const byEnv = [...envMap.entries()].find(([, id]) => id === String(r.categoryId))?.[0];
        return {
          externalCategoryId: String(r.categoryId),
          name,
          gameSlug: byEnv ?? byName,
        };
      });

    for (const [slug, id] of envMap) {
      if (!items.some((i) => i.externalCategoryId === id)) {
        items.push({
          externalCategoryId: id,
          name: slug,
          gameSlug: slug,
        });
      }
    }

    return { items, nextCursor: null, nextOffset: null, totalItems: items.length };
  }

  async listSets(options?: CatalogListOptions): Promise<CatalogPage<CatalogSet>> {
    this.assertConfigured();
    const categoryId = options?.categoryId;
    if (categoryId === undefined || categoryId === "") {
      return { items: [], nextOffset: null };
    }

    const groups = await tcgcsvListGroups(categoryId);
    // TCGCSV returns the full group list (already collated); honor offset/limit locally.
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const slice = groups.slice(offset, offset + limit);
    const items: CatalogSet[] = slice.map((g) => ({
      externalSetId: String(g.groupId),
      externalCategoryId: categoryId,
      name: g.name ?? `Group ${g.groupId}`,
      code: g.abbreviation?.trim() || String(g.groupId),
      releaseDate: g.publishedOn ? new Date(g.publishedOn) : null,
      setType: g.isSupplemental === true ? "OTHER" : "MAIN",
      gameSlug: options?.gameSlug,
    }));
    const nextOffset = offset + slice.length < groups.length ? offset + slice.length : null;
    return { items, nextOffset, totalItems: groups.length };
  }

  async listProducts(options?: CatalogListOptions): Promise<CatalogPage<CatalogProduct>> {
    this.assertConfigured();
    const setId = options?.setId;
    if (setId === undefined || setId === "") {
      return { items: [], nextOffset: null };
    }

    const categoryId = await this.resolveCategoryIdForSet(setId, options?.categoryId);
    if (categoryId === null) {
      return { items: [], nextOffset: null };
    }

    const [products, prices] = await Promise.all([
      tcgcsvListProducts(categoryId, setId),
      tcgcsvListPrices(categoryId, setId),
    ]);

    const pricesByProduct = new Map<string, typeof prices>();
    for (const price of prices) {
      const list = pricesByProduct.get(price.productId) ?? [];
      list.push(price);
      pricesByProduct.set(price.productId, list);
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const slice = products.slice(offset, offset + limit);

    const items = slice.map((product) => {
      const productPrices = pricesByProduct.get(String(product.productId)) ?? [];
      const variants: CatalogVariant[] =
        productPrices.length > 0
          ? productPrices.map((p) => {
              const hints = mapSubTypeToVariantHints(p.subTypeName);
              return {
                variantName: hints.variantName,
                printing: hints.printing,
                language: "EN",
                isFoil: hints.isFoil,
                isParallel: hints.isParallel,
                referenceMarketPrice: p.marketPrice,
                referenceMidPrice: p.midPrice,
              };
            })
          : [{ variantName: "Default", language: "EN", isFoil: false }];

      const primary = productPrices[0];
      const reference =
        primary !== undefined ? pickReferenceUnitPrice(primary) : null;

      return mapProduct(product, options?.gameSlug, reference, variants);
    });

    const nextOffset = offset + slice.length < products.length ? offset + slice.length : null;
    return { items, nextOffset, totalItems: products.length };
  }

  async getProduct(externalProductId: string): Promise<CatalogProduct | null> {
    this.assertConfigured();
    // TCGCSV has no product-by-id endpoint — fail closed rather than invent.
    void externalProductId;
    return null;
  }

  async listVariants(externalProductId: string): Promise<CatalogVariant[]> {
    this.assertConfigured();
    // Variants are attached during listProducts from price subTypeName rows.
    void externalProductId;
    return [{ variantName: "Default", language: "EN", isFoil: false }];
  }

  /**
   * Product URLs require categoryId. Prefer the caller-supplied categoryId;
   * otherwise scan in-scope category maps (pokemon / one-piece) for the group.
   */
  private async resolveCategoryIdForSet(
    setId: string,
    categoryId?: string,
  ): Promise<string | null> {
    if (categoryId !== undefined && categoryId !== "") return categoryId;

    const envMap = tcgplayerCategoryMapFromEnv();
    const candidates = new Set<string>([...envMap.values()]);
    // Defaults used when env map is empty (documented TCGplayer category ids).
    if (candidates.size === 0) {
      candidates.add("3");
      candidates.add("68");
    }

    for (const candidate of candidates) {
      const groups = await tcgcsvListGroups(candidate);
      if (groups.some((g) => String(g.groupId) === setId)) return candidate;
    }
    return null;
  }
}
