import type { CatalogProviderId, CatalogSurfaceKey } from "./types";

export const TCGPLAYER_SURFACES: CatalogSurfaceKey[] = ["categories", "sets", "products"];
export const EBAY_SURFACES: CatalogSurfaceKey[] = ["taxonomy", "catalog_links", "sold_listings"];

export const SURFACE_DISPLAY_NAMES: Record<
  CatalogProviderId,
  Partial<Record<CatalogSurfaceKey, string>>
> = {
  TCGPLAYER: {
    categories: "TCGplayer categories",
    sets: "TCGplayer sets (groups)",
    products: "TCGplayer products + variants",
  },
  EBAY: {
    taxonomy: "eBay taxonomy",
    catalog_links: "eBay catalog / product links",
    sold_listings: "eBay completed/sold listings",
  },
};

export const NOT_CONFIGURED_MESSAGES: Record<CatalogProviderId, string> = {
  TCGPLAYER: "TCGplayer integration not configured.",
  EBAY: "eBay integration not configured.",
};
