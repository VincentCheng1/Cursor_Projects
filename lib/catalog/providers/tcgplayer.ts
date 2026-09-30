import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";
import { tcgplayerIsConfigured } from "@/lib/tcgplayer/config";
import {
  tcgplayerGetProductDetails,
  tcgplayerListCategories,
  tcgplayerListGroupsForCategory,
  tcgplayerListProductsForGroup,
  tcgplayerListSkus,
  type TcgProductRow,
  type TcgSkuRow,
} from "@/lib/tcgplayer/catalog";
import {
  GAME_CATEGORY_NAME_HINTS,
  tcgplayerCategoryMapFromEnv,
} from "@/lib/tcgplayer/category-map";

import type {
  CatalogCategory,
  CatalogListOptions,
  CatalogPage,
  CatalogProduct,
  CatalogProvider,
  CatalogSet,
  CatalogVariant,
} from "../types";

function mapSkuToVariant(sku: TcgSkuRow): CatalogVariant {
  const printing = sku.printingName?.trim() || null;
  const language = sku.languageName?.trim() || "EN";
  const foil =
    printing !== null && /foil|holo|reverse/i.test(printing) ? true : false;
  return {
    externalVariantId: sku.skuId !== undefined ? String(sku.skuId) : undefined,
    variantName: printing ?? sku.conditionName ?? "Default",
    printing,
    language,
    isFoil: foil,
    isParallel: printing !== null && /parallel/i.test(printing),
  };
}

function mapProduct(row: TcgProductRow, gameSlug?: string): CatalogProduct {
  const numberFromExtended = row.extendedData?.find(
    (e) => e.name?.toLowerCase() === "number" || e.name?.toLowerCase() === "card number",
  )?.value;

  return {
    externalProductId: String(row.productId ?? ""),
    externalSetId: row.groupId !== undefined ? String(row.groupId) : undefined,
    name: row.name ?? row.cleanName ?? "Unknown",
    cardNumber: row.number ?? numberFromExtended ?? null,
    rarity: row.rarityName ?? row.rarity ?? null,
    imageUrl: row.imageUrl ?? null,
    gameSlug,
    setName: row.groupName,
    raw: row,
  };
}

function matchGameSlug(categoryName: string): string | undefined {
  const lower = categoryName.toLowerCase();
  for (const [slug, hints] of Object.entries(GAME_CATEGORY_NAME_HINTS)) {
    if (hints.some((h) => lower.includes(h))) return slug;
  }
  return undefined;
}

/** TCGplayer authorized Catalog API provider — never scrapes HTML (spec §14b). */
export class TCGPlayerCatalogProvider implements CatalogProvider {
  readonly id = "TCGPLAYER" as const;
  readonly displayName = "TCGplayer Catalog";

  isConfigured(): boolean {
    return tcgplayerIsConfigured();
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError("TCGplayer");
    }
  }

  async listCategories(_options?: CatalogListOptions): Promise<CatalogPage<CatalogCategory>> {
    this.assertConfigured();
    const envMap = tcgplayerCategoryMapFromEnv();
    const rows = await tcgplayerListCategories();
    const items: CatalogCategory[] = rows
      .filter((r) => r.categoryId !== undefined)
      .map((r) => {
        const name = r.displayName ?? r.name ?? `Category ${r.categoryId}`;
        const byName = matchGameSlug(name);
        const byEnv = [...envMap.entries()].find(([, id]) => id === String(r.categoryId))?.[0];
        return {
          externalCategoryId: String(r.categoryId),
          name,
          gameSlug: byEnv ?? byName,
          parentExternalId:
            r.parentCategoryId !== undefined && r.parentCategoryId !== null
              ? String(r.parentCategoryId)
              : undefined,
        };
      });

    // Ensure env-mapped categories appear even if the list response omitted them.
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
    const page = await tcgplayerListGroupsForCategory(categoryId, {
      offset: options?.offset ?? 0,
      limit: options?.limit ?? 100,
    });
    const items: CatalogSet[] = page.items
      .filter((g) => g.groupId !== undefined)
      .map((g) => ({
        externalSetId: String(g.groupId),
        externalCategoryId: categoryId,
        name: g.name ?? `Group ${g.groupId}`,
        code: g.abbreviation?.trim() || String(g.groupId),
        releaseDate: g.publishedOn ? new Date(g.publishedOn) : null,
        // isSupplemental is structured metadata → OTHER; never free-text promo guess (§14b).
        setType: g.isSupplemental === true ? "OTHER" : "MAIN",
        gameSlug: options?.gameSlug,
      }));
    return {
      items,
      nextOffset: page.nextOffset,
      totalItems: page.totalItems,
    };
  }

  async listProducts(options?: CatalogListOptions): Promise<CatalogPage<CatalogProduct>> {
    this.assertConfigured();
    const setId = options?.setId;
    if (setId === undefined || setId === "") {
      return { items: [], nextOffset: null };
    }
    const page = await tcgplayerListProductsForGroup(setId, {
      offset: options?.offset ?? 0,
      limit: options?.limit ?? 100,
    });
    return {
      items: page.items
        .filter((p) => p.productId !== undefined)
        .map((p) => mapProduct(p, options?.gameSlug)),
      nextOffset: page.nextOffset,
      totalItems: page.totalItems,
    };
  }

  async getProduct(externalProductId: string): Promise<CatalogProduct | null> {
    this.assertConfigured();
    const row = await tcgplayerGetProductDetails(externalProductId);
    if (row === null) return null;
    const product = mapProduct(row);
    product.variants = await this.listVariants(externalProductId);
    return product;
  }

  async listVariants(externalProductId: string): Promise<CatalogVariant[]> {
    this.assertConfigured();
    const skus = await tcgplayerListSkus(externalProductId);
    if (skus.length === 0) {
      return [{ variantName: "Default", language: "EN", isFoil: false }];
    }
    // Deduplicate by variant identity (ignore condition SKUs for catalog variants).
    const seen = new Set<string>();
    const variants: CatalogVariant[] = [];
    for (const sku of skus) {
      const v = mapSkuToVariant(sku);
      const key = `${v.variantName}|${v.printing ?? ""}|${v.language}`;
      if (seen.has(key)) continue;
      seen.add(key);
      variants.push(v);
    }
    return variants;
  }
}
