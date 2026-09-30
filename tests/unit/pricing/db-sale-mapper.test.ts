import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";

import { mapDbSaleToPricingSale } from "@/lib/pricing/mappers/db-sale";
import { isMultiCardLot } from "@/lib/pricing/normalizer/detectLot";
import type { Sale as DbSale } from "@/lib/db/generated/client";

function dbRow(overrides: Partial<DbSale>): DbSale {
  return {
    id: "sale-1",
    source: "EBAY",
    externalSaleId: "ebay-1",
    cardId: "card-charizard",
    variantId: null,
    game: "pokemon",
    cardName: "Charizard",
    setName: "Base Set",
    cardNumber: "4/102",
    condition: "NEAR_MINT",
    language: "EN",
    gradingCompany: "RAW",
    grade: null,
    salePrice: new Decimal("100"),
    shippingPrice: null,
    totalPrice: null,
    currency: "USD",
    saleDate: new Date("2026-09-10T12:00:00Z"),
    listingTitle: "Charizard Base Set 4/102 NM",
    listingUrl: null,
    sellerName: null,
    imageUrl: null,
    copiesCovered: null,
    isLot: false,
    rawData: null,
    fingerprint: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as DbSale;
}

describe("mapDbSaleToPricingSale", () => {
  it("strips forged eBay identity when title does not confirm the stamped card", () => {
    const sale = mapDbSaleToPricingSale(
      dbRow({
        listingTitle: "Pikachu Base Set 58/102 NM",
        cardName: "Charizard",
        cardNumber: "4/102",
        setName: "Base Set",
      }),
    );
    expect(sale.cardId).toBeUndefined();
    expect(sale.cardName).toBeUndefined();
    expect(sale.listingTitle).toBe("Pikachu Base Set 58/102 NM");
  });

  it("keeps eBay card identity but drops variantId that cannot be re-proven from title", () => {
    const sale = mapDbSaleToPricingSale(
      dbRow({
        listingTitle: "Charizard Base Set 4/102 NM",
        variantId: "var-reverse-holo",
      }),
    );
    expect(sale.cardId).toBe("card-charizard");
    expect(sale.cardName).toBe("Charizard");
    expect(sale.variantId).toBeUndefined();
  });

  it("preserves copiesCovered and isLot across the DB round-trip shape", () => {
    const sale = mapDbSaleToPricingSale(
      dbRow({
        source: "TCGPLAYER",
        listingTitle: "Charizard NM",
        copiesCovered: 3,
        isLot: true,
      }),
    );
    expect(sale.copiesCovered).toBe(3);
    expect(sale.isLot).toBe(true);
    expect(isMultiCardLot(sale)).toBe(true);
  });

  it("still detects lots from title when columns were empty", () => {
    const sale = mapDbSaleToPricingSale(
      dbRow({
        listingTitle: "3x Charizard lot bundle Base Set 4/102",
        copiesCovered: null,
        isLot: false,
      }),
    );
    expect(isMultiCardLot(sale)).toBe(true);
  });
});
