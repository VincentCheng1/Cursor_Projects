import type { Sale } from "../../types/sale";
import { assertMockProviderEnvironment } from "./guard";

const BASE = new Date("2026-09-01T12:00:00Z");

/** Synthetic sales for tests only — never presented as live marketplace data (spec §5, §41). */
export const MOCK_CARD_CONTEXT = {
  cardId: "mock-card-1",
  game: "pokemon",
  cardName: "Charizard",
  setName: "Base Set",
  cardNumber: "4/102",
  variantName: "Holo",
  printing: "Unlimited",
  language: "EN",
};

export function buildMockTcgSales(count: number): Sale[] {
  assertMockProviderEnvironment();
  const qualifying = Array.from({ length: count }, (_, i) => {
    const d = new Date(BASE);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      source: "TCGPLAYER" as const,
      externalSaleId: `mock-tcg-${i}`,
      ...MOCK_CARD_CONTEXT,
      condition: "NEAR_MINT" as const,
      gradingCompany: "RAW" as const,
      salePrice: (100 + i).toFixed(2),
      currency: "USD",
      saleDate: d,
      copiesCovered: 1,
    };
  });

  // More-recent non-qualifying rows (wrong condition / graded) so filter-before-limit
  // can prove they do not displace older qualifying comps (Phase 8 / Test 11 shape).
  const newerNonQualifying: Sale[] = [
    {
      source: "TCGPLAYER",
      externalSaleId: "mock-tcg-recent-lp",
      ...MOCK_CARD_CONTEXT,
      condition: "LIGHTLY_PLAYED",
      gradingCompany: "RAW",
      salePrice: "999.00",
      currency: "USD",
      saleDate: new Date("2026-10-05T12:00:00Z"),
      copiesCovered: 1,
    },
    {
      source: "TCGPLAYER",
      externalSaleId: "mock-tcg-recent-psa",
      ...MOCK_CARD_CONTEXT,
      condition: "NEAR_MINT",
      gradingCompany: "PSA",
      grade: "10",
      salePrice: "888.00",
      currency: "USD",
      saleDate: new Date("2026-10-06T12:00:00Z"),
      copiesCovered: 1,
    },
  ];

  return [...qualifying, ...newerNonQualifying];
}

export function buildMockEbaySales(): Sale[] {
  assertMockProviderEnvironment();
  return [
    {
      source: "EBAY",
      externalSaleId: "mock-ebay-1",
      ...MOCK_CARD_CONTEXT,
      condition: "NEAR_MINT",
      gradingCompany: "RAW",
      salePrice: "150.00",
      currency: "USD",
      saleDate: new Date("2026-09-28T12:00:00Z"),
      copiesCovered: 1,
      listingTitle: "Charizard Base Set 4/102 NM",
    },
    // Cross-source duplicate of mock-tcg-0 (same card/date/price; no title/seller) — Phase 8.
    {
      source: "EBAY",
      externalSaleId: "mock-ebay-cross-dup",
      ...MOCK_CARD_CONTEXT,
      condition: "NEAR_MINT",
      gradingCompany: "RAW",
      salePrice: "100.00",
      currency: "USD",
      saleDate: new Date("2026-09-01T12:00:00Z"),
      copiesCovered: 1,
    },
    {
      source: "EBAY",
      externalSaleId: "mock-ebay-lot",
      ...MOCK_CARD_CONTEXT,
      condition: "NEAR_MINT",
      gradingCompany: "RAW",
      salePrice: "300.00",
      currency: "USD",
      saleDate: new Date("2026-09-29T12:00:00Z"),
      listingTitle: "3x Charizard lot bundle",
      copiesCovered: 3,
      isLot: true,
    },
    {
      source: "EBAY",
      externalSaleId: "mock-ebay-cad",
      ...MOCK_CARD_CONTEXT,
      condition: "NEAR_MINT",
      gradingCompany: "RAW",
      salePrice: "99.00",
      currency: "CAD",
      saleDate: new Date("2026-09-30T12:00:00Z"),
      copiesCovered: 1,
    },
    {
      source: "EBAY",
      externalSaleId: "mock-ebay-psa",
      ...MOCK_CARD_CONTEXT,
      condition: "NEAR_MINT",
      gradingCompany: "PSA",
      grade: "10",
      salePrice: "500.00",
      currency: "USD",
      saleDate: new Date("2026-09-30T12:00:00Z"),
      copiesCovered: 1,
    },
    // More-recent non-qualifying (wrong condition) — must not enter NM RAW average.
    {
      source: "EBAY",
      externalSaleId: "mock-ebay-recent-hp",
      ...MOCK_CARD_CONTEXT,
      condition: "HEAVILY_PLAYED",
      gradingCompany: "RAW",
      salePrice: "40.00",
      currency: "USD",
      saleDate: new Date("2026-10-07T12:00:00Z"),
      copiesCovered: 1,
      listingTitle: "Charizard Base Set 4/102 Heavily Played",
    },
  ];
}
