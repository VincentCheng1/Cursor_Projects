import { ebayIsConfigured } from "@/lib/ebay/config";
import { tcgplayerIsConfigured } from "@/lib/tcgplayer/config";

import { EbayPublicDataProvider } from "./providers/ebay";
import { TCGPlayerCatalogProvider } from "./providers/tcgplayer";
import type { CatalogProvider } from "./types";

let cached: { TCGPLAYER: CatalogProvider; EBAY: CatalogProvider } | null = null;

function loadCatalogProviders(): { TCGPLAYER: CatalogProvider; EBAY: CatalogProvider } {
  if (cached !== null) return cached;
  cached = {
    TCGPLAYER: new TCGPlayerCatalogProvider(),
    EBAY: new EbayPublicDataProvider(),
  };
  return cached;
}

export const catalogProviders = {
  get TCGPLAYER() {
    return loadCatalogProviders().TCGPLAYER;
  },
  get EBAY() {
    return loadCatalogProviders().EBAY;
  },
};

export function catalogProviderConfigured(id: "TCGPLAYER" | "EBAY"): boolean {
  return id === "TCGPLAYER" ? tcgplayerIsConfigured() : ebayIsConfigured();
}

/** Test helper — clears provider singleton. */
export function resetCatalogProviderCache(): void {
  cached = null;
}
