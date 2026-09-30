import { describe, expect, it } from "vitest";

import { snapshotTimestampMatchesLive } from "@/lib/pricing/services/live-vs-snapshot";

describe("snapshotTimestampMatchesLive", () => {
  it("matches when live and snapshot agree on average cents and salesUsed", () => {
    expect(
      snapshotTimestampMatchesLive({
        liveAverage: 127.45,
        liveSalesUsed: 12,
        snapshotAverage: 127.45,
        snapshotSalesUsed: 12,
      }),
    ).toBe(true);
  });

  it("rejects when averages diverge (live vs stale snapshot)", () => {
    expect(
      snapshotTimestampMatchesLive({
        liveAverage: 130,
        liveSalesUsed: 12,
        snapshotAverage: 127.45,
        snapshotSalesUsed: 12,
      }),
    ).toBe(false);
  });

  it("rejects when salesUsed diverges", () => {
    expect(
      snapshotTimestampMatchesLive({
        liveAverage: 127.45,
        liveSalesUsed: 14,
        snapshotAverage: 127.45,
        snapshotSalesUsed: 12,
      }),
    ).toBe(false);
  });

  it("rejects null live or missing snapshot", () => {
    expect(
      snapshotTimestampMatchesLive({
        liveAverage: null,
        liveSalesUsed: 0,
        snapshotAverage: 100,
        snapshotSalesUsed: 5,
      }),
    ).toBe(false);
    expect(
      snapshotTimestampMatchesLive({
        liveAverage: 100,
        liveSalesUsed: 5,
        snapshotAverage: null,
        snapshotSalesUsed: 5,
      }),
    ).toBe(false);
  });
});
