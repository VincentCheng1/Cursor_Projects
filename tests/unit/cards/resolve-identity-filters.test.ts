import { describe, expect, it } from "vitest";

import { buildCardResolveWhere } from "@/lib/cards/resolve-identity-filters";

describe("buildCardResolveWhere", () => {
  it("requires exact card number and optional set filters", () => {
    const where = buildCardResolveWhere({
      cardNumber: "4/102",
      set: "Base Set",
      setType: "MAIN",
      isFoil: true,
      year: 1999,
    });
    expect(where.cardNumber).toEqual({ equals: "4/102", mode: "insensitive" });
    expect(where.set).toMatchObject({
      setType: "MAIN",
      OR: [
        { name: { equals: "Base Set", mode: "insensitive" } },
        { code: { equals: "Base Set", mode: "insensitive" } },
      ],
    });
    expect(where.variants).toEqual({ some: { isFoil: true } });
  });
});
