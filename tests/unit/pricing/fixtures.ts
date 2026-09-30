import type { Sale } from "@/lib/pricing/types/sale";

/** Fixed clock for tests so sale dates are never "in the future". */
export const TEST_NOW = new Date("2026-12-31T12:00:00Z");

const BASE = new Date("2026-09-01T12:00:00Z");

export const MATCH_CRITERIA = {
  cardId: "card-1",
  game: "pokemon",
  cardName: "charizard",
  setName: "base set",
  cardNumber: "4/102",
  variantName: "holo",
  printing: "unlimited",
  language: "EN",
  condition: "NEAR_MINT" as const,
  gradingCompany: "RAW" as const,
};

export function makeSale(overrides: Partial<Sale> & { salePrice: number | string }): Sale {
  const day = overrides.saleDate ?? BASE;
  return {
    source: "TCGPLAYER",
    externalSaleId: `sale-${Math.random().toString(36).slice(2, 9)}`,
    currency: "USD",
    saleDate: day,
    copiesCovered: 1,
    isLot: false,
    ...MATCH_CRITERIA,
    gradingCompany: "RAW",
    grade: undefined,
    condition: "NEAR_MINT",
    ...overrides,
  };
}

export function makeDatedSales(
  count: number,
  price = 100,
  /** Newest sale date; older sales count backward from here. */
  newest = TEST_NOW,
): Sale[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(newest);
    d.setUTCDate(d.getUTCDate() - (count - 1 - i));
    return makeSale({
      externalSaleId: `dated-${i}`,
      salePrice: price + i,
      saleDate: d,
    });
  });
}
