import { describe, expect, it } from "vitest";

import {
  filterSalesByQueryOptions,
  takeRecentSales,
} from "@/lib/pricing/services/sale-query";
import type { Sale } from "@/lib/pricing/types/sale";

function sale(overrides: Partial<Sale> & { externalSaleId: string; saleDate: Date }): Sale {
  return {
    source: "TCGPLAYER",
    cardId: "c1",
    cardName: "Charizard",
    setName: "Base Set",
    cardNumber: "4/102",
    condition: "NEAR_MINT",
    gradingCompany: "RAW",
    salePrice: "100",
    currency: "USD",
    copiesCovered: 1,
    ...overrides,
  };
}

describe("filterSalesByQueryOptions (filter before limit)", () => {
  it("drops non-matching condition/grading before the caller limit is applied", () => {
    const rows = [
      sale({
        externalSaleId: "nm-1",
        saleDate: new Date("2026-09-10"),
        condition: "NEAR_MINT",
        salePrice: "10",
      }),
      sale({
        externalSaleId: "lp-newer",
        saleDate: new Date("2026-09-20"),
        condition: "LIGHTLY_PLAYED",
        salePrice: "999",
      }),
      sale({
        externalSaleId: "psa-newer",
        saleDate: new Date("2026-09-21"),
        condition: "NEAR_MINT",
        gradingCompany: "PSA",
        grade: "10",
        salePrice: "888",
      }),
      sale({
        externalSaleId: "nm-2",
        saleDate: new Date("2026-09-05"),
        condition: "NEAR_MINT",
        salePrice: "12",
      }),
    ];

    const filtered = filterSalesByQueryOptions(rows, {
      condition: "NEAR_MINT",
      gradingCompany: "RAW",
    });
    expect(filtered.map((s) => s.externalSaleId)).toEqual(["nm-1", "nm-2"]);

    const limited = takeRecentSales(filtered, 1);
    expect(limited).toHaveLength(1);
    expect(limited[0]?.externalSaleId).toBe("nm-1");
  });
});
