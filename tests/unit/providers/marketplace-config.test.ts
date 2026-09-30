import { describe, expect, it, vi, afterEach } from "vitest";

import { EbayPublicDataProvider } from "@/lib/catalog/providers/ebay";
import { TCGPlayerCatalogProvider } from "@/lib/catalog/providers/tcgplayer";
import { ebayIsConfigured } from "@/lib/ebay/config";
import { EbayPriceProvider } from "@/lib/pricing/providers/ebay";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";
import { TCGPlayerPriceProvider } from "@/lib/pricing/providers/tcgplayer";
import { tcgplayerIsConfigured } from "@/lib/tcgplayer/config";

describe("marketplace provider configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("TCGplayer pricing + catalog fail closed without credentials", async () => {
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "");
    expect(tcgplayerIsConfigured()).toBe(false);
    const price = new TCGPlayerPriceProvider();
    const catalog = new TCGPlayerCatalogProvider();
    expect(price.isConfigured()).toBe(false);
    expect(catalog.isConfigured()).toBe(false);
    await expect(price.searchCards("x")).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    await expect(
      price.getRecentSales({ cardName: "x" }, { limit: 20 }),
    ).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    await expect(catalog.listCategories()).rejects.toBeInstanceOf(ProviderNotConfiguredError);
  });

  it("eBay pricing + catalog fail closed without credentials", async () => {
    vi.stubEnv("EBAY_CLIENT_ID", "");
    vi.stubEnv("EBAY_CLIENT_SECRET", "");
    expect(ebayIsConfigured()).toBe(false);
    const price = new EbayPriceProvider();
    const catalog = new EbayPublicDataProvider();
    expect(price.isConfigured()).toBe(false);
    expect(catalog.isConfigured()).toBe(false);
    await expect(
      price.getRecentSales({ cardName: "x" }, { limit: 20 }),
    ).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    await expect(catalog.listCategories()).rejects.toBeInstanceOf(ProviderNotConfiguredError);
  });

  it("real providers report configured when env vars are set", () => {
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "id");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "secret");
    vi.stubEnv("EBAY_CLIENT_ID", "ebay-id");
    vi.stubEnv("EBAY_CLIENT_SECRET", "ebay-secret");
    expect(tcgplayerIsConfigured()).toBe(true);
    expect(ebayIsConfigured()).toBe(true);
    expect(new TCGPlayerPriceProvider().isConfigured()).toBe(true);
    expect(new EbayPriceProvider().isConfigured()).toBe(true);
    expect(new TCGPlayerCatalogProvider().isConfigured()).toBe(true);
    expect(new EbayPublicDataProvider().isConfigured()).toBe(true);
  });
});
