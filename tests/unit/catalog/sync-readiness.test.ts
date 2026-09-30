import { afterEach, describe, expect, it, vi } from "vitest";

import { getSyncReadiness } from "@/lib/catalog/sync-readiness";
import { syncPublicData } from "@/lib/jobs/handlers/sync-public-data";

describe("sync readiness / dry-run", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fail-closed when marketplace credentials are absent", () => {
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "");
    vi.stubEnv("EBAY_CLIENT_ID", "");
    vi.stubEnv("EBAY_CLIENT_SECRET", "");

    const report = getSyncReadiness();
    expect(report.dryRun).toBe(true);
    expect(report.canRunPublicDataSync).toBe(false);
    expect(report.canRefreshPrices).toBe(false);
    expect(report.surfacesEnabled).toEqual([]);
    expect(report.surfacesSkipped.length).toBeGreaterThan(0);
    expect(report.providers.every((p) => p.configured === false)).toBe(true);
    expect(report.providers.find((p) => p.id === "TCGPLAYER")?.missingEnvVars).toEqual([
      "TCGPLAYER_CLIENT_ID",
      "TCGPLAYER_CLIENT_SECRET",
    ]);
    expect(report.providers.find((p) => p.id === "EBAY")?.missingEnvVars).toEqual([
      "EBAY_CLIENT_ID",
      "EBAY_CLIENT_SECRET",
    ]);
    expect(report.summary).toMatch(/No marketplace credentials/i);
    // Readiness is metadata only — never embeds a fabricated catalog payload.
    expect(report).not.toHaveProperty("cards");
    expect(report).not.toHaveProperty("sales");
    expect(report.surfacesEnabled).toHaveLength(0);
  });

  it("reports ready surfaces when credentials are present (no API calls)", () => {
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "tcg-id");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "tcg-secret");
    vi.stubEnv("EBAY_CLIENT_ID", "");
    vi.stubEnv("EBAY_CLIENT_SECRET", "");

    const report = getSyncReadiness();
    expect(report.dryRun).toBe(true);
    expect(report.canRunPublicDataSync).toBe(true);
    expect(report.canRefreshPrices).toBe(true);
    expect(report.providers.find((p) => p.id === "TCGPLAYER")?.configured).toBe(true);
    expect(report.providers.find((p) => p.id === "EBAY")?.configured).toBe(false);
    expect(report.surfacesEnabled.every((s) => s.provider === "TCGPLAYER")).toBe(true);
    expect(report.surfacesEnabled.map((s) => s.surface)).toEqual([
      "categories",
      "sets",
      "products",
    ]);
    // Readiness must not echo secret values.
    expect(JSON.stringify(report)).not.toContain("tcg-secret");
    expect(JSON.stringify(report)).not.toContain("tcg-id");
  });

  it("syncPublicData still fail-closed without credentials (companion to dry-run)", async () => {
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "");
    vi.stubEnv("EBAY_CLIENT_ID", "");
    vi.stubEnv("EBAY_CLIENT_SECRET", "");

    const outcome = await syncPublicData();
    expect(outcome.processed).toBe(0);
    expect(outcome.failed).toBe(0);
    expect(outcome.errors?.[0]).toMatch(/providers configured|HTML scraping/i);
  });
});
