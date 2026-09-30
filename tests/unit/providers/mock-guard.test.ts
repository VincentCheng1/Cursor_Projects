import { afterEach, describe, expect, it, vi } from "vitest";

import { assertMockProviderEnvironment } from "@/lib/pricing/providers/mock/guard";
import { MockEbayProvider } from "@/lib/pricing/providers/mock/ebay";

describe("mock provider guard §41", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows construction in test environment", () => {
    expect(() => new MockEbayProvider()).not.toThrow();
  });

  it("assertMockProviderEnvironment passes under vitest", () => {
    expect(() => assertMockProviderEnvironment()).not.toThrow();
  });

  it("refuses to load outside test/e2e runtimes", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CARDVAULT_E2E", "");
    expect(() => assertMockProviderEnvironment()).toThrow(/test\/e2e/);
  });

  it("allows CARDVAULT_E2E=1 in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CARDVAULT_E2E", "1");
    expect(() => assertMockProviderEnvironment()).not.toThrow();
  });

  it("allows CARDVAULT_E2E=1 under production NODE_ENV (Playwright next start)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CARDVAULT_E2E", "1");
    expect(() => assertMockProviderEnvironment()).not.toThrow();
  });
});
