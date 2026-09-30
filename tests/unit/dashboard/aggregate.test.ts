import { describe, expect, it } from "vitest";

import { buildDashboardMetrics, rowFromItem } from "@/lib/dashboard/aggregate";

describe("buildDashboardMetrics", () => {
  it("aggregates collection value and ROI", () => {
    const row = rowFromItem(
      {
        id: "1",
        cardId: "c1",
        quantity: 2,
        purchasePrice: { toString: () => "10" },
        createdAt: new Date(),
        updatedAt: new Date(),
        card: { name: "Test", set: { game: { slug: "pokemon", name: "Pokémon" } } },
      },
      15,
    );
    const metrics = buildDashboardMetrics([row]);
    expect(metrics.collectionValue).toBe(30);
    expect(metrics.cardsOwned).toBe(2);
    expect(metrics.uniqueCards).toBe(1);
  });
});
