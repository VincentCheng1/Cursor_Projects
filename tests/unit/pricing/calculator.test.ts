import { describe, expect, it } from "vitest";

import { calculateRecentSalesAverage } from "@/lib/pricing/calculator/calculateRecentSalesAverage";
import { deduplicateSales, saleDuplicateKey } from "@/lib/pricing/calculator/deduplicateSales";
import { filterQualifyingSales } from "@/lib/pricing/calculator/filterQualifyingSales";
import { saleAmount } from "@/lib/pricing/calculator/saleAmount";
import {
  calculateCollectionValue,
  calculateProfit,
  calculateROI,
  calculateTotalCost,
} from "@/lib/pricing/calculator/collectionValue";
import { listingConfirmsCardIdentity, ebayIdentityFromListing, listingConfirmsVariantIdentity } from "@/lib/pricing/normalizer/attributeListing";
import { normalizeCondition } from "@/lib/pricing/normalizer/normalizeCondition";
import { normalizeCurrency } from "@/lib/pricing/normalizer/normalizeCurrency";
import { normalizeEbaySale } from "@/lib/pricing/normalizer/normalizeSale";
import { toMoneyString } from "@/lib/pricing/money";
import { makeSale, TEST_NOW } from "./fixtures";
describe("deduplicateSales", () => {
  it("keys on source + externalSaleId", () => {
    const a = makeSale({ externalSaleId: "x", salePrice: 1 });
    const b = { ...a };
    expect(deduplicateSales([a, b])).toHaveLength(1);
    expect(saleDuplicateKey(a)).toContain("TCGPLAYER");
  });

  it("collapses the same transaction across TCGPLAYER and EBAY (§22)", () => {
    const shared = {
      salePrice: 42.5,
      saleDate: new Date("2026-09-15T12:00:00Z"),
      listingTitle: "Charizard Holo 4/102 NM",
      sellerName: "cardshop",
      cardId: "card-1",
      cardName: "charizard",
      setName: "base set",
      cardNumber: "4/102",
      currency: "USD" as const,
    };
    const tcg = makeSale({
      ...shared,
      source: "TCGPLAYER",
      externalSaleId: "tcg-txn-1",
    });
    const ebay = makeSale({
      ...shared,
      source: "EBAY",
      externalSaleId: "ebay-item-9",
    });
    expect(deduplicateSales([tcg, ebay])).toHaveLength(1);
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

  it("refuses empty match instead of averaging unrelated cards (§16)", () => {
    const a = makeSale({
      cardId: "card-a",
      cardName: "charizard",
      salePrice: 10,
      externalSaleId: "a",
    });
    const b = makeSale({
      cardId: "card-b",
      cardName: "pikachu",
      salePrice: 1000,
      externalSaleId: "b",
    });
    const { qualifying, excluded } = filterQualifyingSales([a, b], {
      currency: "USD",
    });
    expect(qualifying).toHaveLength(0);
    expect(excluded.every((e) => e.reason === "INSUFFICIENT_MATCH_CRITERIA")).toBe(true);

    const r = calculateRecentSalesAverage([a, b], 20, { currency: "USD", now: TEST_NOW });
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.salesUsed).toBe(0);
    expect(r.average).toBeNull();
  });

  it("includes sales with missing gradingCompany in a RAW match", () => {
    const ebayRawShaped = makeSale({
      source: "EBAY",
      externalSaleId: "ebay-raw-1",
      salePrice: 55,
      gradingCompany: undefined,
      grade: undefined,
    });
    const match = {
      cardId: "card-1",
      condition: "NEAR_MINT" as const,
      gradingCompany: "RAW" as const,
    };
    const { qualifying, excluded } = filterQualifyingSales([ebayRawShaped], {
      match,
      currency: "USD",
      now: TEST_NOW,
    });
    expect(qualifying).toHaveLength(1);
    expect(excluded.some((e) => e.reason === "UNKNOWN_GRADING")).toBe(false);

    const r = calculateRecentSalesAverage([ebayRawShaped], 20, {
      match,
      currency: "USD",
      now: TEST_NOW,
    });
    expect(r.status).toBe("CALCULATED");
    expect(r.salesUsed).toBe(1);
    expect(r.average).toBe(55);
  });
});

describe("normalizers", () => {
  it("normalizeCondition maps NM", () => {
    expect(normalizeCondition("NM")).toBe("NEAR_MINT");
  });
  it("normalizeCondition maps common eBay labels", () => {
    expect(normalizeCondition("New")).toBe("NEAR_MINT");
    expect(normalizeCondition("Like New")).toBe("NEAR_MINT");
    expect(normalizeCondition("Brand New")).toBe("NEAR_MINT");
    expect(normalizeCondition("Good")).toBe("HEAVILY_PLAYED");
    expect(normalizeCondition("Acceptable")).toBe("HEAVILY_PLAYED");
  });
  it("normalizeCondition maps eBay used-cascade and NM/M aliases", () => {
    expect(normalizeCondition("Used - Like New")).toBe("NEAR_MINT");
    expect(normalizeCondition("Used - Very Good")).toBe("MODERATELY_PLAYED");
    expect(normalizeCondition("Used - Good")).toBe("HEAVILY_PLAYED");
    expect(normalizeCondition("Used - Acceptable")).toBe("HEAVILY_PLAYED");
    expect(normalizeCondition("NM/M")).toBe("NEAR_MINT");
    expect(normalizeCondition("For parts or not working")).toBe("DAMAGED");
    // Bare ambiguous labels stay excluded
    expect(normalizeCondition("Used")).toBeUndefined();
    expect(normalizeCondition("Played")).toBeUndefined();
  });
  it("normalizeCurrency maps USD", () => {
    expect(normalizeCurrency("usd")).toBe("USD");
  });
});

describe("eBay listing attribution §16", () => {
  const CHARIZARD = {
    cardId: "card-charizard",
    game: "pokemon",
    cardName: "Charizard",
    setName: "Base Set",
    cardNumber: "4/102",
    language: "EN",
  };

  it("does not stamp requested identity onto an unrelated Pikachu title", () => {
    const sale = normalizeEbaySale(
      {
        itemId: "ebay-pika-1",
        title: "Pikachu Base Set 58/102 NM",
        price: { value: 12.5, currency: "USD" },
        lastSoldDate: "2026-09-10T12:00:00Z",
        condition: "Near Mint",
      },
      CHARIZARD,
    );
    expect(sale).not.toBeNull();
    expect(sale!.cardId).toBeUndefined();
    expect(sale!.cardName).toBeUndefined();
    expect(sale!.listingTitle).toBe("Pikachu Base Set 58/102 NM");
  });

  it("excludes a Pikachu listing from a Charizard average (regression)", () => {
    const pikachuHit = normalizeEbaySale(
      {
        itemId: "ebay-pika-avg",
        title: "Pikachu Base Set 58/102 NM",
        price: { value: 999, currency: "USD" },
        lastSoldDate: "2026-09-20T12:00:00Z",
        condition: "Near Mint",
      },
      CHARIZARD,
    );
    const realCharizard = normalizeEbaySale(
      {
        itemId: "ebay-zard-1",
        title: "Charizard Base Set 4/102 Holo NM",
        price: { value: 100, currency: "USD" },
        lastSoldDate: "2026-09-18T12:00:00Z",
        condition: "Near Mint",
      },
      CHARIZARD,
    );

    expect(pikachuHit).not.toBeNull();
    expect(realCharizard).not.toBeNull();
    expect(realCharizard!.cardId).toBe("card-charizard");
    expect(realCharizard!.cardName).toBe("Charizard");

    const match = {
      cardId: "card-charizard",
      cardName: "Charizard",
      setName: "Base Set",
      cardNumber: "4/102",
      condition: "NEAR_MINT" as const,
      gradingCompany: "RAW" as const,
    };

    const { qualifying, excluded } = filterQualifyingSales(
      [pikachuHit!, realCharizard!],
      { match, currency: "USD", now: TEST_NOW },
    );
    expect(qualifying).toHaveLength(1);
    expect(qualifying[0]?.externalSaleId).toBe("ebay-zard-1");
    expect(excluded.some((e) => e.sale.externalSaleId === "ebay-pika-avg")).toBe(
      true,
    );

    const r = calculateRecentSalesAverage([pikachuHit!, realCharizard!], 20, {
      match,
      currency: "USD",
      now: TEST_NOW,
    });
    expect(r.status).toBe("CALCULATED");
    expect(r.salesUsed).toBe(1);
    expect(r.average).toBe(100);
  });

  it("confirms identity when title carries name + number", () => {
    expect(
      listingConfirmsCardIdentity("Charizard Base Set 4/102 NM Holo", {
        cardName: "Charizard",
        setName: "Base Set",
        cardNumber: "4/102",
      }),
    ).toBe(true);
  });

  it("rejects name-only titles without set or number evidence", () => {
    expect(
      listingConfirmsCardIdentity("Charizard PSA 10 gem mint", {
        cardName: "Charizard",
        setName: "Base Set",
        cardNumber: "4/102",
      }),
    ).toBe(false);
  });

  it("rejects name + set without card number when the catalog card has a number", () => {
    expect(
      listingConfirmsCardIdentity("Charizard Base Set Holo NM", {
        cardName: "Charizard",
        setName: "Base Set",
        cardNumber: "4/102",
      }),
    ).toBe(false);
  });

  it("rejects name + set when the title carries a conflicting card number", () => {
    expect(
      listingConfirmsCardIdentity("Charizard Base Set 58/102 NM", {
        cardName: "Charizard",
        setName: "Base Set",
        cardNumber: "4/102",
      }),
    ).toBe(false);
  });

  it("allows name + set when the catalog card has no card number", () => {
    expect(
      listingConfirmsCardIdentity("Promo Charizard Base Set Holo NM", {
        cardName: "Charizard",
        setName: "Base Set",
      }),
    ).toBe(true);
  });

  it("does not stamp variantId when only an id is requested without title phrases", () => {
    const identity = ebayIdentityFromListing(
      { title: "Charizard Base Set 4/102 NM" },
      { ...CHARIZARD, variantId: "var-reverse-holo" },
    );
    expect(identity.cardId).toBe("card-charizard");
    expect(identity.variantId).toBeUndefined();
  });

  it("does not stamp requested variant/printing when the title lacks evidence", () => {
    const reverseHoloRequest = {
      ...CHARIZARD,
      variantId: "var-reverse-holo",
      variantName: "Reverse Holo",
      printing: "Reverse Holo",
    };

    // Card-level evidence only — no Reverse Holo phrase.
    const identity = ebayIdentityFromListing(
      { title: "Charizard Base Set 4/102 NM" },
      reverseHoloRequest,
    );
    expect(identity.cardId).toBe("card-charizard");
    expect(identity.cardName).toBe("Charizard");
    expect(identity.variantId).toBeUndefined();
    expect(identity.variantName).toBeUndefined();
    expect(identity.printing).toBeUndefined();
    expect(
      listingConfirmsVariantIdentity("Charizard Base Set 4/102 NM", {
        variantName: "Reverse Holo",
        printing: "Reverse Holo",
      }),
    ).toBe(false);

    const sale = normalizeEbaySale(
      {
        itemId: "ebay-non-holo",
        title: "Charizard Base Set 4/102 NM",
        price: { value: 55, currency: "USD" },
        lastSoldDate: "2026-09-15T12:00:00Z",
        condition: "Near Mint",
      },
      reverseHoloRequest,
    );
    expect(sale).not.toBeNull();
    expect(sale!.cardId).toBe("card-charizard");
    expect(sale!.variantId).toBeUndefined();
    expect(sale!.variantName).toBeUndefined();
    expect(sale!.printing).toBeUndefined();

    const match = {
      cardId: "card-charizard",
      variantId: "var-reverse-holo",
      variantName: "Reverse Holo",
      printing: "Reverse Holo",
      cardName: "Charizard",
      setName: "Base Set",
      cardNumber: "4/102",
      condition: "NEAR_MINT" as const,
      gradingCompany: "RAW" as const,
    };
    const { qualifying } = filterQualifyingSales([sale!], {
      match,
      currency: "USD",
      now: TEST_NOW,
    });
    expect(qualifying).toHaveLength(0);

    const confirmed = normalizeEbaySale(
      {
        itemId: "ebay-reverse",
        title: "Charizard Base Set 4/102 Reverse Holo NM",
        price: { value: 80, currency: "USD" },
        lastSoldDate: "2026-09-16T12:00:00Z",
        condition: "Near Mint",
      },
      reverseHoloRequest,
    );
    expect(confirmed!.variantId).toBe("var-reverse-holo");
    expect(confirmed!.variantName).toBe("Reverse Holo");
    const ok = filterQualifyingSales([confirmed!], {
      match,
      currency: "USD",
      now: TEST_NOW,
    });
    expect(ok.qualifying).toHaveLength(1);
  });
});

describe("decimal precision", () => {
  it("rounds without float drift", () => {
    expect(toMoneyString("127.449999999")).toBe("127.45");
  });
});

describe("saleAmount §19", () => {
  it("adds shipping when totalPrice equals salePrice", () => {
    const sale = makeSale({
      salePrice: 100,
      shippingPrice: 10,
      totalPrice: 100,
      externalSaleId: "ship-1",
    });
    expect(saleAmount(sale, "SALE_PLUS_SHIPPING")?.toFixed(2)).toBe("110.00");
    expect(saleAmount(sale, "SALE_PRICE_ONLY")?.toFixed(2)).toBe("100.00");
  });

  it("does not double-count when totalPrice already includes shipping", () => {
    const sale = makeSale({
      salePrice: 100,
      shippingPrice: 10,
      totalPrice: 110,
      externalSaleId: "ship-2",
    });
    expect(saleAmount(sale, "SALE_PLUS_SHIPPING")?.toFixed(2)).toBe("110.00");
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
