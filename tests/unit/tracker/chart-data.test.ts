import { describe, expect, it } from "vitest";

import { mergeTrackerChartData, rangeChangePercent } from "@/lib/tracker/chart-data";

describe("mergeTrackerChartData", () => {
  it("aligns series on shared timestamps without inventing prices", () => {
    const merged = mergeTrackerChartData([
      {
        seriesId: "a",
        cardId: "c1",
        variantId: null,
        points: [
          { at: "2026-01-01T00:00:00.000Z", averagePrice: 10 },
          { at: "2026-01-02T00:00:00.000Z", averagePrice: 12 },
        ],
      },
      {
        seriesId: "b",
        cardId: "c2",
        variantId: null,
        points: [{ at: "2026-01-02T00:00:00.000Z", averagePrice: 20 }],
      },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]?.a).toBe(10);
    expect(merged[0]?.b).toBeNull();
    expect(merged[1]?.a).toBe(12);
    expect(merged[1]?.b).toBe(20);
  });
});

describe("rangeChangePercent", () => {
  it("computes percent change from first to last point", () => {
    const pct = rangeChangePercent([
      { averagePrice: 100 },
      { averagePrice: 110 },
    ]);
    expect(pct).toBe(10);
  });
});
