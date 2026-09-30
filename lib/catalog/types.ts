import type { SetType } from "@/lib/db/generated/client";

/** Public marketplace catalog surfaces (spec §14b). */
export type CatalogSurfaceKey =
  | "categories"
  | "sets"
  | "products"
  | "taxonomy"
  | "catalog_links"
  | "sold_listings";

export type CatalogProviderId = "TCGPLAYER" | "EBAY";

export interface CatalogCategory {
  externalCategoryId: string;
  name: string;
  /** CardVault game slug when mapped (pokemon | one-piece). */
  gameSlug?: string;
  parentExternalId?: string;
}

export interface CatalogSet {
  externalSetId: string;
  externalCategoryId: string;
  name: string;
  code: string;
  releaseDate?: Date | null;
  /** Only from structured public metadata — never guessed at query time (§8 / §14b). */
  setType?: SetType;
  gameSlug?: string;
}

export interface CatalogVariant {
  externalVariantId?: string;
  variantName: string;
  printing?: string | null;
  language?: string;
  isFoil?: boolean;
  isParallel?: boolean;
}

export interface CatalogProduct {
  externalProductId: string;
  externalSetId?: string;
  name: string;
  cardNumber?: string | null;
  rarity?: string | null;
  imageUrl?: string | null;
  gameSlug?: string;
  setName?: string;
  setCode?: string;
  variants?: CatalogVariant[];
  /** Marketplace list/market price — reference only; never CardVault calculated value (§2). */
  referenceMarketPrice?: number | null;
  raw?: unknown;
}

export interface CatalogListOptions {
  cursor?: string | null;
  offset?: number;
  limit?: number;
  categoryId?: string;
  setId?: string;
  gameSlug?: string;
}

export interface CatalogPage<T> {
  items: T[];
  /** Next offset/cursor when more pages remain; null when exhausted. */
  nextCursor?: string | null;
  nextOffset?: number | null;
  totalItems?: number;
}

/**
 * Authorized public catalog API seam (spec §14b).
 * Implementations must never scrape HTML and must disable when unconfigured (§12).
 */
export interface CatalogProvider {
  readonly id: CatalogProviderId;
  readonly displayName: string;

  isConfigured(): boolean;

  listCategories(options?: CatalogListOptions): Promise<CatalogPage<CatalogCategory>>;
  listSets(options?: CatalogListOptions): Promise<CatalogPage<CatalogSet>>;
  listProducts(options?: CatalogListOptions): Promise<CatalogPage<CatalogProduct>>;
  getProduct(externalProductId: string): Promise<CatalogProduct | null>;
  listVariants(externalProductId: string): Promise<CatalogVariant[]>;
}

export type PublicDataSurfaceHealth =
  | { status: "READY" }
  | { status: "NOT_CONFIGURED"; message: string }
  | { status: "NEVER_SYNCED"; message: string }
  | { status: "ERROR"; message: string };

export interface PublicDataSurfaceStatus {
  provider: CatalogProviderId;
  surface: CatalogSurfaceKey;
  displayName: string;
  health: PublicDataSurfaceHealth;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  rowCount: number;
  cursor: string | null;
}
