import { describe, expect, it, vi, afterEach } from "vitest";

import { ebayIsConfigured } from "@/lib/ebay/config";
import { tcgplayerIsConfigured } from "@/lib/tcgplayer/config";
import { TCGPlayerPriceProvider } from "@/lib/pricing/providers/tcgplayer";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";

describe("marketplace provider configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("TCGplayer disabled without credentials", async () => {
    vi.stubEnv("TCGPLAYER_CLIENT_ID", "");
    vi.stubEnv("TCGPLAYER_CLIENT_SECRET", "");
    expect(tcgplayerIsConfigured()).toBe(false);
    const provider = new TCGPlayerPriceProvider();
    expect(provider.isConfigured()).toBe(false);
    await expect(provider.searchCards("x")).rejects.toBeInstanceOf(ProviderNotConfiguredError);
  });

  it("eBay disabled without credentials", () => {
    vi.stubEnv("EBAY_CLIENT_ID", "");
    vi.stubEnv("EBAY_CLIENT_SECRET", "");
    expect(ebayIsConfigured()).toBe(false);
  });
});
