import { describe, expect, it } from "vitest";

import {
  isMoverPeriod,
  periodStartDate,
  rankMovers,
  type MoverPoint,
} from "@/lib/dashboard/movers";

function points(...prices: number[]): MoverPoint[] {
  return prices.map((averagePrice, i) => ({
    at: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
    averagePrice,
  }));
}

describe("periodStartDate", () => {
  it("offsets daily/weekly/monthly in UTC days", () => {
    const now = new Date("2026-09-30T12:00:00.000Z");
    expect(periodStartDate("daily", now).toISOString()).toBe("2026-09-29T12:00:00.000Z");
    expect(periodStartDate("weekly", now).toISOString()).toBe("2026-09-23T12:00:00.000Z");
    expect(periodStartDate("monthly", now).toISOString()).toBe("2026-08-31T12:00:00.000Z");
  });
});

describe("isMoverPeriod", () => {
  it("accepts known periods only", () => {
    expect(isMoverPeriod("daily")).toBe(true);
    expect(isMoverPeriod("weekly")).toBe(true);
    expect(isMoverPeriod("monthly")).toBe(true);
    expect(isMoverPeriod("yearly")).toBe(false);
  });
});

describe("rankMovers", () => {
  it("ranks gainers and decliners by percent change", () => {
    const window = rankMovers(
      [
        {
          cardId: "up-big",
          variantId: null,
          cardName: "Big Gainer",
          setName: "Set A",
          gameSlug: "pokemon",
          gameName: "Pokémon",
          points: points(100, 150),
        },
        {
          cardId: "up-small",
          variantId: null,
          cardName: "Small Gainer",
          setName: "Set A",
          gameSlug: "pokemon",
          gameName: "Pokémon",
          points: points(100, 110),
        },
        {
          cardId: "down-big",
          variantId: "v1",
          cardName: "Big Decliner",
          setName: "Set B",
          gameSlug: "one-piece",
          gameName: "One Piece",
          points: points(100, 50),
        },
        {
          cardId: "down-small",
          variantId: null,
          cardName: "Small Decliner",
          setName: "Set B",
          gameSlug: "one-piece",
          gameName: "One Piece",
          points: points(100, 90),
        },
        {
          cardId: "flat",
          variantId: null,
          cardName: "Flat",
          setName: "Set C",
          gameSlug: "pokemon",
          gameName: "Pokémon",
          points: points(100, 100),
        },
        {
          cardId: "single",
          variantId: null,
          cardName: "One Point",
          setName: "Set C",
          gameSlug: "pokemon",
          gameName: "Pokémon",
          points: points(100),
        },
      ],
      5,
    );

    expect(window.gainers.map((c) => c.cardId)).toEqual(["up-big", "up-small"]);
    expect(window.gainers[0]?.percentChange).toBe(50);
    expect(window.gainers[0]?.absoluteChange).toBe(50);

    expect(window.decliners.map((c) => c.cardId)).toEqual(["down-big", "down-small"]);
    expect(window.decliners[0]?.percentChange).toBe(-50);
    expect(window.decliners[0]?.absoluteChange).toBe(-50);
  });

  it("respects the limit", () => {
    const groups = Array.from({ length: 6 }, (_, i) => ({
      cardId: `c${i}`,
      variantId: null,
      cardName: `Card ${i}`,
      setName: "Set",
      gameSlug: "pokemon",
      gameName: "Pokémon",
      points: points(100, 100 + (i + 1) * 10),
    }));
    const window = rankMovers(groups, 3);
    expect(window.gainers).toHaveLength(3);
    expect(window.gainers[0]?.cardId).toBe("c5");
  });
});
