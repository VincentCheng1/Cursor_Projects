import { describe, expect, it } from "vitest";

import { calculateCombinedValue, wrongMeanOfSourceAverages } from "@/lib/pricing/calculator/calculateCombinedValue";
import { calculateRecentSalesAverage } from "@/lib/pricing/calculator/calculateRecentSalesAverage";
import { MATCH_CRITERIA, TEST_NOW, makeDatedSales, makeSale } from "./fixtures";

const opts = { match: MATCH_CRITERIA, currency: "USD" as const, now: TEST_NOW };

describe("§39 required price tests", () => {
  it("Test 1 — 20 sales → salesUsed = 20", () => {
    const sales = makeDatedSales(20);
    const r = calculateRecentSalesAverage(sales, 20, opts);
    expect(r.status).toBe("CALCULATED");
    expect(r.salesUsed).toBe(20);
    expect(r.salesAvailable).toBe(20);
  });

  it("Test 2 — 19 sales → salesUsed = 19", () => {
    const r = calculateRecentSalesAverage(makeDatedSales(19), 20, opts);
    expect(r.salesUsed).toBe(19);
  });

  it("Test 3 — 5 sales → salesUsed = 5", () => {
    const r = calculateRecentSalesAverage(makeDatedSales(5), 20, opts);
    expect(r.salesUsed).toBe(5);
  });

  it("Test 4 — 1 sale → salesUsed = 1, average = sale price", () => {
    const r = calculateRecentSalesAverage([makeSale({ salePrice: 42.5 })], 20, opts);
    expect(r.salesUsed).toBe(1);
    expect(r.average).toBe(42.5);
  });

  it("Test 5 — 0 sales → INSUFFICIENT_DATA", () => {
    const r = calculateRecentSalesAverage([], 20, opts);
    expect(r.average).toBeNull();
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.salesUsed).toBe(0);
  });

  it("Test 6 — 100 sales → only 20 most recent included", () => {
    const sales = makeDatedSales(100);
    const r = calculateRecentSalesAverage(sales, 20, opts);
    expect(r.salesUsed).toBe(20);
    const ids = r.usedSales.map((u) => u.sale.externalSaleId);
    expect(ids).toContain("dated-99");
    expect(ids).not.toContain("dated-0");
  });

  it("Test 7 — duplicate sales not counted twice", () => {
    const s = makeSale({ externalSaleId: "dup-1", salePrice: 50 });
    const r = calculateRecentSalesAverage([s, { ...s }], 20, opts);
    expect(r.salesUsed).toBe(1);
  });

  it("Test 8 — NM sale excluded from LP calculation", () => {
    const lp = makeSale({ condition: "LIGHTLY_PLAYED", salePrice: 10 });
    const nm = makeSale({ condition: "NEAR_MINT", salePrice: 999, externalSaleId: "nm" });
    const r = calculateRecentSalesAverage([lp, nm], 20, {
      match: { ...MATCH_CRITERIA, condition: "LIGHTLY_PLAYED" },
      currency: "USD",
    });
    expect(r.salesUsed).toBe(1);
    expect(r.average).toBe(10);
    expect(r.usedSales[0]?.sale.condition).toBe("LIGHTLY_PLAYED");
  });

  it("Test 9 — alternate art excluded from base variant calculation", () => {
    const base = makeSale({ variantName: "holo", salePrice: 20 });
    const alt = makeSale({
      variantName: "alternate art",
      salePrice: 500,
      externalSaleId: "alt",
    });
    const r = calculateRecentSalesAverage([base, alt], 20, opts);
    expect(r.salesUsed).toBe(1);
    expect(r.usedSales[0]?.sale.variantName).toBe("holo");
  });

  it("Test 10 — PSA 10 excluded from raw calculation", () => {
    const raw = makeSale({ gradingCompany: "RAW", salePrice: 30 });
    const graded = makeSale({
      gradingCompany: "PSA",
      grade: "10",
      salePrice: 300,
      externalSaleId: "psa",
    });
    const r = calculateRecentSalesAverage([raw, graded], 20, {
      match: { ...MATCH_CRITERIA, gradingCompany: "RAW" },
      currency: "USD",
    });
    expect(r.salesUsed).toBe(1);
    expect(r.usedSales[0]?.sale.gradingCompany).toBe("RAW");
  });

  it("Test 11 — filter before limit: 20 most recent qualifying, not recent non-qualifying", () => {
    const qualifying = makeDatedSales(25, 10, new Date("2026-12-20T12:00:00Z"));
    const recentWrong = Array.from({ length: 10 }, (_, i) =>
      makeSale({
        externalSaleId: `wrong-${i}`,
        salePrice: 1,
        saleDate: new Date(`2026-09-${String(20 + i).padStart(2, "0")}T12:00:00Z`),
        condition: "DAMAGED",
      }),
    );
    const r = calculateRecentSalesAverage([...qualifying, ...recentWrong], 20, opts);
    expect(r.salesUsed).toBe(20);
    expect(r.salesAvailable).toBe(25);
    for (const u of r.usedSales) {
      expect(u.sale.condition).toBe("NEAR_MINT");
      expect(u.sale.externalSaleId).toMatch(/^dated-/);
    }
    const usedIds = r.usedSales.map((u) => u.sale.externalSaleId).sort();
    const expectedIds = qualifying
      .slice(-20)
      .map((s) => s.externalSaleId)
      .sort();
    expect(usedIds).toEqual(expectedIds);
  });

  it("Test 12 — multi-card lot excluded, not divided", () => {
    const single = makeSale({ salePrice: 100, externalSaleId: "single" });
    const lot = makeSale({
      salePrice: 300,
      externalSaleId: "lot",
      listingTitle: "Charizard x3 lot bundle",
      copiesCovered: 3,
    });
    const r = calculateRecentSalesAverage([single, lot], 20, opts);
    expect(r.salesUsed).toBe(1);
    expect(r.average).toBe(100);
    expect(r.excludedSales.some((e) => e.reason === "MULTI_CARD_LOT")).toBe(true);
  });

  it("Test 13 — combined value is pooled §22, not mean of source averages", () => {
    const tcg = makeDatedSales(20, 100, new Date("2026-12-01T12:00:00Z")).map((s) => ({
      ...s,
      source: "TCGPLAYER" as const,
    }));
    const ebay = [0, 1, 2].map((i) =>
      makeSale({
        source: "EBAY",
        externalSaleId: `ebay-${i}`,
        salePrice: 200 + i,
        saleDate: new Date(`2026-09-${String(25 + i).padStart(2, "0")}T12:00:00Z`),
      }),
    );
    const { combined, bySource } = calculateCombinedValue(
      { TCGPLAYER: tcg, EBAY: ebay },
      20,
      opts,
    );
    expect(combined.salesUsed).toBe(20);
    expect(combined.salesUsed).not.toBe(23);
    const wrong = wrongMeanOfSourceAverages(bySource);
    expect(combined.average).not.toBe(wrong);
    const pooledManual = calculateRecentSalesAverage([...tcg, ...ebay], 20, opts);
    expect(combined.average).toBe(pooledManual.average);
    expect(combined.usedSales.map((u) => u.sale.externalSaleId)).toEqual(
      pooledManual.usedSales.map((u) => u.sale.externalSaleId),
    );
  });

  it("Test 14 — CAD sales excluded from USD average", () => {
    const usd = makeSale({ salePrice: 50, currency: "USD", externalSaleId: "usd" });
    const cad = makeSale({ salePrice: 50, currency: "CAD", externalSaleId: "cad" });
    const r = calculateRecentSalesAverage([usd, cad], 20, opts);
    expect(r.salesUsed).toBe(1);
    expect(r.average).toBe(50);
    expect(r.excludedSales.some((e) => e.reason === "CURRENCY_MISMATCH")).toBe(true);
  });
});
