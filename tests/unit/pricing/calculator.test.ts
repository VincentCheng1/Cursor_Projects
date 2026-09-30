import { describe, expect, it } from "vitest";

import { deduplicateSales, saleDuplicateKey } from "@/lib/pricing/calculator/deduplicateSales";
import { filterQualifyingSales } from "@/lib/pricing/calculator/filterQualifyingSales";
import {
  calculateCollectionValue,
  calculateProfit,
  calculateROI,
  calculateTotalCost,
} from "@/lib/pricing/calculator/collectionValue";
import { normalizeCondition } from "@/lib/pricing/normalizer/normalizeCondition";
import { normalizeCurrency } from "@/lib/pricing/normalizer/normalizeCurrency";
import { toMoneyString } from "@/lib/pricing/money";
import { makeSale } from "./fixtures";

describe("deduplicateSales", () => {
  it("keys on source + externalSaleId", () => {
    const a = makeSale({ externalSaleId: "x", salePrice: 1 });
    const b = { ...a };
    expect(deduplicateSales([a, b])).toHaveLength(1);
    expect(saleDuplicateKey(a)).toContain("TCGPLAYER");
  });
});

describe("filterQualifyingSales", () => {
  it("returns qualifying rows separately from excluded", () => {
    const { qualifying } = filterQualifyingSales([makeSale({ salePrice: 5 })], {
      match: {
        cardId: "card-1",
        condition: "NEAR_MINT",
        gradingCompany: "RAW",
      },
      currency: "USD",
    });
    expect(qualifying).toHaveLength(1);
  });
});

describe("normalizers", () => {
  it("normalizeCondition maps NM", () => {
    expect(normalizeCondition("NM")).toBe("NEAR_MINT");
  });
  it("normalizeCurrency maps USD", () => {
    expect(normalizeCurrency("usd")).toBe("USD");
  });
});

describe("decimal precision", () => {
  it("rounds without float drift", () => {
    expect(toMoneyString("127.449999999")).toBe("127.45");
  });
});

describe("collection math §23", () => {
  it("sums item values and profit/roi", () => {
    const items = [
      { quantity: 2, currentCardValue: 10, purchasePrice: 5 },
      { quantity: 1, currentCardValue: null, purchasePrice: 100 },
    ];
    const cv = calculateCollectionValue(items);
    expect(cv).toBe(20);
    const cost = calculateTotalCost(items);
    expect(calculateProfit(cv, cost)).toBe(-90);
    expect(calculateROI(cv, cost)).not.toBeNull();
    expect(calculateROI(100, 0)).toBeNull();
  });
});
