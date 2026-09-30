import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TcgCsvCatalogProvider } from "@/lib/catalog/providers/tcgcsv";
import { resetCatalogProviderCache } from "@/lib/catalog/registry";
import { getSyncReadiness } from "@/lib/catalog/sync-readiness";
import {
  tcgcsvIsEnabled,
  tcgcsvServesTcgplayerSlot,
} from "@/lib/tcgcsv/config";
import {
  mapSubTypeToVariantHints,
  normalizeTcgCsvPriceRow,
  parseTcgCsvPricesCsv,
  parseTcgCsvText,
  pickExtendedField,
  pickReferenceUnitPrice,
} from "@/lib/tcgcsv/parse";
import type { TcgCsvProduct } from "@/lib/tcgcsv/types";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";
import { resetPriceProviderCache, tcgplayerPriceSlotHealth } from "@/lib/pricing/providers/registry";
import { TcgCsvPriceProvider } from "@/lib/pricing/providers/tcgcsv";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/tcgcsv");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

describe("TCGCSV parse / normalize", () => {
  it("parses Categories.csv snippet into rows", () => {
    const rows = parseTcgCsvText(readFixture("Categories.csv.snippet"));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.categoryId).toBe("3");
    expect(rows[0]?.displayName).toBe("Pokemon");
    expect(rows[1]?.categoryId).toBe("68");
  });

  it("normalizes Prices.csv — keeps market/mid, drops empty market+mid", () => {
    const prices = parseTcgCsvPricesCsv(readFixture("Prices.csv.snippet"));
    expect(prices).toHaveLength(3);
    expect(prices.map((p) => p.productId).sort()).toEqual(["451396", "451784", "451784"]);
    const holo = prices.find((p) => p.subTypeName === "Holofoil");
    expect(holo?.marketPrice).toBe(0.53);
    expect(holo?.midPrice).toBe(0.51);
    expect(prices.some((p) => p.productId === "999001")).toBe(false);
  });

  it("pickReferenceUnitPrice prefers market over mid", () => {
    expect(
      pickReferenceUnitPrice({
        productId: "1",
        subTypeName: "Normal",
        marketPrice: 2.1,
        midPrice: 2.5,
        lowPrice: 1,
        highPrice: 10,
      }),
    ).toBe(2.1);
    expect(
      pickReferenceUnitPrice({
        productId: "1",
        subTypeName: "Normal",
        marketPrice: null,
        midPrice: 2.5,
        lowPrice: null,
        highPrice: null,
      }),
    ).toBe(2.5);
    expect(
      pickReferenceUnitPrice({
        productId: "1",
        subTypeName: "Normal",
        marketPrice: null,
        midPrice: null,
        lowPrice: 1,
        highPrice: 10,
      }),
    ).toBeNull();
  });

  it("maps subTypeName to variant hints without inventing foil", () => {
    expect(mapSubTypeToVariantHints("Normal")).toEqual({
      variantName: "Default",
      printing: null,
      isFoil: false,
      isParallel: false,
    });
    expect(mapSubTypeToVariantHints("Holofoil").isFoil).toBe(true);
    expect(mapSubTypeToVariantHints("Reverse Holofoil").variantName).toBe("Reverse Holofoil");
  });

  it("reads extendedData Number/Rarity from product fixture", () => {
    const products = JSON.parse(readFixture("products.json")) as {
      results: TcgCsvProduct[];
    };
    const lugia = products.results[0]!;
    expect(pickExtendedField(lugia, ["number", "card number"])).toBe("139/195");
    expect(pickExtendedField(lugia, ["rarity"])).toBe("Ultra Rare");
  });

  it("normalizeTcgCsvPriceRow accepts JSON-shaped rows", () => {
    const row = normalizeTcgCsvPriceRow({
      productId: 451784,
      lowPrice: 0.1,
      midPrice: 0.51,
      highPrice: 25.51,
      marketPrice: 0.53,
      directLowPrice: 0.44,
      subTypeName: "Holofoil",
    });
    expect(row).toEqual({
      productId: "451784",
      subTypeName: "Holofoil",
      marketPrice: 0.53,
      midPrice: 0.51,
      lowPrice: 0.1,
      highPrice: 25.51,
    });
  });
});

describe("TCGCSV config / providers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetCatalogProviderCache();
    resetPriceProviderCache();
  });

  it("stays disabled in test runtime unless explicitly enabled", () => {
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "");
    vi.stubEnv("CARDVAULT_PRICE_SOURCE", "");
    vi.stubEnv("TCGCSV_ENABLED", "");
    expect(tcgcsvIsEnabled()).toBe(false);
    expect(tcgcsvServesTcgplayerSlot()).toBe(false);
  });

  it("enables when CARDVAULT_PRICE_SOURCE=tcgcsv", () => {
    vi.stubEnv("CARDVAULT_PRICE_SOURCE", "tcgcsv");
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "");
    expect(tcgcsvIsEnabled()).toBe(true);
  });

  it("disables when CARDVAULT_PRICE_SOURCE=tcgplayer even if TCGCSV_ENABLED=1", () => {
    vi.stubEnv("CARDVAULT_PRICE_SOURCE", "tcgplayer");
    vi.stubEnv("TCGCSV_ENABLED", "1");
    expect(tcgcsvIsEnabled()).toBe(false);
  });

  it("catalog + price providers fail closed when disabled", async () => {
    vi.stubEnv("CARDVAULT_PRICE_SOURCE", "tcgplayer");
    vi.stubEnv("TCGCSV_ENABLED", "0");
    const catalog = new TcgCsvCatalogProvider();
    const price = new TcgCsvPriceProvider();
    expect(catalog.isConfigured()).toBe(false);
    expect(price.isConfigured()).toBe(false);
    await expect(catalog.listCategories()).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    await expect(price.getRecentSales({ cardName: "x" }, { limit: 20 })).rejects.toBeInstanceOf(
      ProviderNotConfiguredError,
    );
  });

  it("price provider returns empty sales (no invented completed sales)", async () => {
    vi.stubEnv("CARDVAULT_PRICE_SOURCE", "tcgcsv");
    const price = new TcgCsvPriceProvider();
    expect(price.isConfigured()).toBe(true);
    const sales = await price.getRecentSales(
      { cardName: "Lugia VSTAR", externalIds: { tcgplayer: "451396" } },
      { limit: 20 },
    );
    expect(sales).toEqual([]);
  });

  it("sync readiness reports TCGCSV catalog ready but sales pricing not ready", () => {
    vi.stubEnv("CARDVAULT_PRICE_SOURCE", "tcgcsv");
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "");
    vi.stubEnv("EBAY_CLIENT_ID", "");
    vi.stubEnv("EBAY_CLIENT_SECRET", "");

    const report = getSyncReadiness();
    const tcg = report.providers.find((p) => p.id === "TCGPLAYER");
    expect(tcg?.configured).toBe(true);
    expect(tcg?.catalogReady).toBe(true);
    expect(tcg?.pricingReady).toBe(false);
    expect(tcg?.dataSource).toBe("tcgcsv");
    expect(report.canRunPublicDataSync).toBe(true);
    expect(report.canRefreshPrices).toBe(false);
    expect(report.summary).toMatch(/TCGCSV/i);
  });

  it("price slot health is UNAVAILABLE for TCGCSV (never READY for sales)", () => {
    vi.stubEnv("CARDVAULT_PRICE_SOURCE", "tcgcsv");
    expect(tcgcsvServesTcgplayerSlot()).toBe(true);
    expect(new TcgCsvPriceProvider().isConfigured()).toBe(true);

    const health = tcgplayerPriceSlotHealth({ configured: true, usingTcgCsv: true });
    expect(health.status).toBe("UNAVAILABLE");
    if (health.status === "UNAVAILABLE") {
      expect(health.message).toMatch(/no completed-sales|catalog\/reference only/i);
    }
    expect(tcgplayerPriceSlotHealth({ configured: true, usingTcgCsv: false }).status).toBe(
      "READY",
    );
  });
});
