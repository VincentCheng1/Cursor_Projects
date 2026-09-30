import { describe, expect, it } from "vitest";

import { buildCardResolveWhere } from "@/lib/cards/resolve-identity-filters";
import { effectivePrintYear, releaseYearFromDate } from "@/lib/cards/print-year";

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
    expect(where.OR).toBeDefined();
    expect(where.OR).toHaveLength(2);
    expect(where.OR?.[0]).toMatchObject({
      set: {
        setType: "MAIN",
        OR: [
          { name: { equals: "Base Set", mode: "insensitive" } },
          { code: { equals: "Base Set", mode: "insensitive" } },
        ],
      },
      variants: { some: { printYear: 1999, isFoil: true } },
    });
    expect(where.OR?.[1]).toMatchObject({
      set: {
        setType: "MAIN",
        releaseDate: {
          gte: new Date(Date.UTC(1999, 0, 1)),
          lt: new Date(Date.UTC(2000, 0, 1)),
        },
      },
    });
  });

  it("filters by set without year", () => {
    const where = buildCardResolveWhere({
      cardNumber: "4/102",
      set: "Base Set",
      setType: "MAIN",
      isFoil: true,
    });
    expect(where.set).toMatchObject({
      setType: "MAIN",
      OR: [
        { name: { equals: "Base Set", mode: "insensitive" } },
        { code: { equals: "Base Set", mode: "insensitive" } },
      ],
    });
    expect(where.variants).toEqual({ some: { isFoil: true } });
    expect(where.OR).toBeUndefined();
  });
});

describe("effectivePrintYear", () => {
  it("prefers variant printYear over set releaseDate", () => {
    expect(effectivePrintYear(2000, new Date("1999-01-09T00:00:00.000Z"))).toBe(2000);
    expect(effectivePrintYear(null, new Date("1999-01-09T00:00:00.000Z"))).toBe(1999);
    expect(effectivePrintYear(undefined, null)).toBeNull();
  });

  it("reads UTC year from releaseDate", () => {
    expect(releaseYearFromDate(new Date("1999-12-31T23:00:00.000Z"))).toBe(1999);
  });
});
