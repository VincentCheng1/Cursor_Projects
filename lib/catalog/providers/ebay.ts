import { ebayIsConfigured } from "@/lib/ebay/config";
import { ebayBrowseSearch, extractEbayProductLink } from "@/lib/ebay/browse";
import {
  collectTcgLeafCategories,
  ebayGetCategoryTree,
} from "@/lib/ebay/taxonomy";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";

import type {
  CatalogCategory,
  CatalogListOptions,
  CatalogPage,
  CatalogProduct,
  CatalogProvider,
  CatalogSet,
  CatalogVariant,
} from "../types";

/**
 * eBay public-data partner for taxonomy + catalog links (spec §14b).
 * Sold comps stay on PriceProvider.getRecentSales / syncEbaySoldListings.
 * Never scrapes HTML; disables when credentials are missing.
 */
export class EbayPublicDataProvider implements CatalogProvider {
  readonly id = "EBAY" as const;
  readonly displayName = "eBay Public Data";

  isConfigured(): boolean {
    return ebayIsConfigured();
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError("eBay");
    }
  }

  async listCategories(_options?: CatalogListOptions): Promise<CatalogPage<CatalogCategory>> {
    this.assertConfigured();
    const tree = await ebayGetCategoryTree();
    const leaves = collectTcgLeafCategories(tree.rootCategoryNode);
    const items: CatalogCategory[] = leaves.map((leaf) => {
      const lower = leaf.categoryName.toLowerCase();
      let gameSlug: string | undefined;
      if (lower.includes("pokemon") || lower.includes("pokémon")) gameSlug = "pokemon";
      else if (lower.includes("one piece")) gameSlug = "one-piece";
      return {
        externalCategoryId: leaf.categoryId,
        name: leaf.categoryName,
        gameSlug,
      };
    });
    return { items, nextCursor: null, nextOffset: null, totalItems: items.length };
  }

  /**
   * eBay is listing-first — sets are not a first-class taxonomy.
   * Returns empty; set→card tree remains TCGplayer-backed (§14b).
   */
  async listSets(_options?: CatalogListOptions): Promise<CatalogPage<CatalogSet>> {
    this.assertConfigured();
    return { items: [], nextOffset: null, totalItems: 0 };
  }

  /**
   * Browse/search item summaries for catalog-link discovery.
   * Requires `options.gameSlug` or a free-text query via categoryId placeholder isn't used —
   * callers pass setName-like query in `options.setId` as search keywords when linking.
   */
  async listProducts(options?: CatalogListOptions): Promise<CatalogPage<CatalogProduct>> {
    this.assertConfigured();
    const q =
      options?.setId !== undefined && options.setId !== ""
        ? options.setId
        : options?.gameSlug === "one-piece"
          ? "One Piece Card Game"
          : options?.gameSlug === "pokemon"
            ? "Pokemon TCG"
            : "";
    if (q === "") return { items: [], nextOffset: null };

    const page = await ebayBrowseSearch({
      q,
      categoryIds: options?.categoryId ? [options.categoryId] : undefined,
      offset: options?.offset ?? 0,
      limit: options?.limit ?? 50,
    });

    const items: CatalogProduct[] = page.items.map((item) => {
      const link = extractEbayProductLink(item);
      return {
        externalProductId: link ?? item.itemId ?? "",
        name: item.title ?? "Unknown",
        imageUrl: item.image?.imageUrl ?? null,
        gameSlug: options?.gameSlug,
        raw: item,
      };
    }).filter((p) => p.externalProductId !== "");

    return {
      items,
      nextOffset: page.nextOffset,
      totalItems: page.total,
    };
  }

  async getProduct(externalProductId: string): Promise<CatalogProduct | null> {
    this.assertConfigured();
    // Browse getItem is item-id oriented; return a minimal identity shell — never invent sales.
    if (externalProductId === "") return null;
    return {
      externalProductId,
      name: externalProductId,
    };
  }

  async listVariants(_externalProductId: string): Promise<CatalogVariant[]> {
    this.assertConfigured();
    return [];
  }
}
