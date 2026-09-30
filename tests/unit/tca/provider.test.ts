import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { calculateRecentSalesAverage } from "@/lib/pricing/calculator/calculateRecentSalesAverage";
import { EbayPriceProvider } from "@/lib/pricing/providers/ebay";
import {
  createEbaySlotPriceProvider,
  resetPriceProviderCache,
} from "@/lib/pricing/providers/registry";
import { TcaRestPriceProvider } from "@/lib/pricing/providers/tca-rest";
import { tcaIsConfigured } from "@/lib/tca/config";
import {
  buildTcaSalesQuery,
  isTcaEbayCompletedSale,
  normalizeTcaEbaySale,
  tcaFindCompletedEbaySales,
} from "@/lib/tca/sales";
import type { TcaSaleRecord, TcaSalesResponse } from "@/lib/tca/types";

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/tca/market-sales-ebay.json"), "utf8"),
) as TcaSalesResponse;

const card = {
  cardId: "card-charizard-base",
  cardName: "Charizard",
  setName: "Base Set",
  cardNumber: "4/102",
};

const matchOpts = {
  match: {
    cardId: card.cardId,
    cardName: card.cardName,
    setName: card.setName,
    cardNumber: card.cardNumber,
    condition: "NEAR_MINT" as const,
    gradingCompany: "RAW" as const,
  },
  currency: "USD" as const,
  now: new Date("2026-09-30T21:00:00Z"),
};

describe("The Card API (TCA) eBay replacement", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetPriceProviderCache();
  });

  it("isConfigured only when TCA_API_KEY is set", () => {
    vi.stubEnv("TCA_API_KEY", "");
    expect(tcaIsConfigured()).toBe(false);
    expect(new TcaRestPriceProvider().isConfigured()).toBe(false);

    vi.stubEnv("TCA_API_KEY", "tca_REDACTED_TEST_KEY_NOT_REAL");
    expect(tcaIsConfigured()).toBe(true);
    expect(new TcaRestPriceProvider().isConfigured()).toBe(true);
  });

  it("EBAY slot prefers TcaRestPriceProvider when TCA_API_KEY is set", () => {
    vi.stubEnv("TCA_API_KEY", "tca_REDACTED_TEST_KEY_NOT_REAL");
    vi.stubEnv("EBAY_CLIENT_ID", "ebay-id");
    vi.stubEnv("EBAY_CLIENT_SECRET", "ebay-secret");
    const provider = createEbaySlotPriceProvider();
    expect(provider).toBeInstanceOf(TcaRestPriceProvider);
    expect(provider.id).toBe("EBAY");
  });

  it("EBAY slot falls back to EbayPriceProvider without TCA key", () => {
    vi.stubEnv("TCA_API_KEY", "");
    vi.stubEnv("EBAY_CLIENT_ID", "ebay-id");
    vi.stubEnv("EBAY_CLIENT_SECRET", "ebay-secret");
    const provider = createEbaySlotPriceProvider();
    expect(provider).toBeInstanceOf(EbayPriceProvider);
  });

  it("buildTcaSalesQuery requires enough identity text", () => {
    expect(buildTcaSalesQuery({ cardName: "ab" })).toBeNull();
    expect(buildTcaSalesQuery(card)).toBe("Charizard Base Set 4/102");
  });

  it("maps only completed eBay rows — rejects TCGplayer platform and missing price", () => {
    const rows = fixture.data;
    expect(isTcaEbayCompletedSale(rows[0]!)).toBe(true);
    expect(isTcaEbayCompletedSale(rows[3]!)).toBe(false); // TCGplayer
    expect(isTcaEbayCompletedSale(rows[4]!)).toBe(false); // missing price

    const matched = normalizeTcaEbaySale(rows[0]!, card);
    expect(matched).not.toBeNull();
    expect(matched!.source).toBe("EBAY");
    expect(matched!.externalSaleId).toBe("ebay-111111111111");
    expect(Number(matched!.salePrice)).toBe(412.5);
    expect(matched!.gradingCompany).toBe("PSA");
    expect(matched!.grade).toBe("10");
    expect(matched!.cardId).toBe(card.cardId);

    const lotty = normalizeTcaEbaySale(rows[2]!, card);
    // Title does not confirm Base Set / 4/102 — conservative matching leaves identity unset
    expect(lotty).not.toBeNull();
    expect(lotty!.cardId).toBeUndefined();

    expect(normalizeTcaEbaySale(rows[3]!, card)).toBeNull();
    expect(normalizeTcaEbaySale(rows[4]!, card)).toBeNull();
  });

  it("fetches sales via fixture HTTP and feeds 20-sale averages (no invented rows)", async () => {
    vi.stubEnv("TCA_API_KEY", "tca_REDACTED_TEST_KEY_NOT_REAL");

    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const sales = await tcaFindCompletedEbaySales(card, { limit: 20 });
    expect(fetchMock).toHaveBeenCalled();
    const calls = fetchMock.mock.calls as unknown as Array<[unknown, ...unknown[]]>;
    expect(calls.length).toBeGreaterThan(0);
    const calledUrl = String(calls[0]?.[0] ?? "");
    expect(calledUrl).toContain("/sales");
    expect(calledUrl).toContain("platform=ebay");
    expect(JSON.stringify(sales)).not.toMatch(/tca_[0-9a-f]{8}/i);

    expect(sales.length).toBeGreaterThanOrEqual(2);
    expect(sales.every((s) => s.source === "EBAY")).toBe(true);

    const attributed = sales.filter((s) => s.cardId === card.cardId);
    expect(attributed.length).toBeGreaterThanOrEqual(1);

    // Raw NM slice — PSA row is excluded by grading match (honest filter-before-limit)
    const rawSlice = attributed.filter(
      (s) => s.gradingCompany === undefined || s.gradingCompany === "RAW",
    );
    expect(rawSlice.length).toBeGreaterThanOrEqual(1);

    const avg = calculateRecentSalesAverage(rawSlice, 20, matchOpts);
    expect(avg.status).toBe("CALCULATED");
    expect(avg.salesUsed).toBeGreaterThanOrEqual(1);
    expect(avg.average).not.toBeNull();
    expect(Number(avg.average)).toBeGreaterThan(0);
  });

  it("fail-closed when Market API returns an error status", async () => {
    vi.stubEnv("TCA_API_KEY", "tca_REDACTED_TEST_KEY_NOT_REAL");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ detail: "boom" }), { status: 500 })),
    );

    await expect(tcaFindCompletedEbaySales(card, { limit: 20 })).rejects.toThrow(/The Card API|HTTP 500/i);
  });

  it("does not silently treat a non-sale listing-shaped row as a completed sale", () => {
    const listingOnly = {
      id: "active-1",
      platform: "eBay",
      title: "Charizard Base Set 4/102",
      listing_type: "fixed_price",
    } as TcaSaleRecord;
    expect(isTcaEbayCompletedSale(listingOnly)).toBe(false);
    expect(normalizeTcaEbaySale(listingOnly, card)).toBeNull();
  });

  it("rejects unconfirmed price_confirmed=false estimates", () => {
    const unconfirmed: TcaSaleRecord = {
      id: "ebay-unconfirmed",
      platform: "eBay",
      title: "Charizard Base Set 4/102 Holo",
      sale_date: "2026-09-28",
      sold_at: "2026-09-28T12:00:00Z",
      price: 100,
      currency: "USD",
      price_confirmed: false,
    };
    expect(isTcaEbayCompletedSale(unconfirmed)).toBe(false);
    expect(normalizeTcaEbaySale(unconfirmed, card)).toBeNull();
  });
});
