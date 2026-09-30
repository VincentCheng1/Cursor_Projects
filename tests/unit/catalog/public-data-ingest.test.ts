import { describe, expect, it, vi, afterEach } from "vitest";

import { EbayPublicDataProvider } from "@/lib/catalog/providers/ebay";
import { TCGPlayerCatalogProvider } from "@/lib/catalog/providers/tcgplayer";
import { syncPublicData } from "@/lib/jobs/handlers/sync-public-data";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";

describe("Phase 13a catalog providers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("TCGPlayerCatalogProvider disables without credentials", async () => {
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "");
    const provider = new TCGPlayerCatalogProvider();
    expect(provider.isConfigured()).toBe(false);
    await expect(provider.listCategories()).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    await expect(provider.listSets({ categoryId: "3" })).rejects.toBeInstanceOf(
      ProviderNotConfiguredError,
    );
  });

  it("EbayPublicDataProvider disables without credentials", async () => {
    vi.stubEnv("EBAY_CLIENT_ID", "");
    vi.stubEnv("EBAY_CLIENT_SECRET", "");
    const provider = new EbayPublicDataProvider();
    expect(provider.isConfigured()).toBe(false);
    await expect(provider.listCategories()).rejects.toBeInstanceOf(ProviderNotConfiguredError);
  });

  it("syncPublicData reports unconfigured providers instead of scraping", async () => {
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "");
    vi.stubEnv("EBAY_CLIENT_ID", "");
    vi.stubEnv("EBAY_CLIENT_SECRET", "");

    const outcome = await syncPublicData();
    expect(outcome.processed).toBe(0);
    expect(outcome.errors?.some((e) => /not configured|HTML scraping/i.test(e))).toBe(true);
  });
});

describe("catalog upsert preference helpers", () => {
  it("does not expose an HTML scraper module", async () => {
    // Defense-in-depth: Phase 13a must not ship a scrape fallback (§14b).
    const scraperGlobs = [
      "@/lib/catalog/scrape",
      "@/lib/tcgplayer/scrape",
      "@/lib/ebay/scrape",
    ];
    for (const id of scraperGlobs) {
      await expect(import(id)).rejects.toBeTruthy();
    }
  });
});
