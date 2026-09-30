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

  it("refuses to load outside NODE_ENV=test", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => assertMockProviderEnvironment()).toThrow(/NODE_ENV=test/);
  });
});
