import type { Sale } from "../../types/sale";

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
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(BASE);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      source: "TCGPLAYER",
      externalSaleId: `mock-tcg-${i}`,
      ...MOCK_CARD_CONTEXT,
      condition: "NEAR_MINT",
      gradingCompany: "RAW",
      salePrice: (100 + i).toFixed(2),
      currency: "USD",
      saleDate: d,
      copiesCovered: 1,
    };
  });
}

export function buildMockEbaySales(): Sale[] {
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
  ];
}
