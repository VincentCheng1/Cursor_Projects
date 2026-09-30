import { afterEach, describe, expect, it, vi } from "vitest";

describe("refresh rate-limit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("blocks repeated refreshes within cooldown", async () => {
    vi.stubEnv("CARDVAULT_E2E", "");
    vi.stubEnv("PRICE_REFRESH_COOLDOWN_MS", "60000");
    const { assertSingleCardRefreshAllowed, clearRefreshCooldowns } = await import(
      "@/lib/pricing/rate-limit"
    );
    clearRefreshCooldowns();
    assertSingleCardRefreshAllowed("u1", "c1");
    expect(() => assertSingleCardRefreshAllowed("u1", "c1")).toThrow(/Rate limit/);
  });

  it("clearRefreshCooldowns allows an immediate retry", async () => {
    vi.stubEnv("CARDVAULT_E2E", "");
    vi.stubEnv("PRICE_REFRESH_COOLDOWN_MS", "60000");
    const { assertSingleCardRefreshAllowed, clearRefreshCooldowns } = await import(
      "@/lib/pricing/rate-limit"
    );
    clearRefreshCooldowns();
    assertSingleCardRefreshAllowed("u1", "c1");
    clearRefreshCooldowns();
    expect(() => assertSingleCardRefreshAllowed("u1", "c1")).not.toThrow();
  });
});
