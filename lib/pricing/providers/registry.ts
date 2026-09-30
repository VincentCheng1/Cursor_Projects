import type { PriceProvider } from "../types/provider";
import type { ProviderStatus } from "../types/provider";
import { EbayPriceProvider } from "./ebay";
import { isMockProviderRuntime } from "./mock-env";
import { TCGPlayerPriceProvider } from "./tcgplayer";

let cached: { TCGPLAYER: PriceProvider; EBAY: PriceProvider } | null = null;

function loadProviders(): { TCGPLAYER: PriceProvider; EBAY: PriceProvider } {
  if (cached !== null) return cached;

  if (isMockProviderRuntime()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MockTCGPlayerProvider } = require("./mock/tcgplayer") as typeof import("./mock/tcgplayer");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MockEbayProvider } = require("./mock/ebay") as typeof import("./mock/ebay");
    cached = {
      TCGPLAYER: new MockTCGPlayerProvider(),
      EBAY: new MockEbayProvider(),
    };
    return cached;
  }

  cached = {
    TCGPLAYER: new TCGPlayerPriceProvider(),
    EBAY: new EbayPriceProvider(),
  };
  return cached;
}

export const priceProviders = {
  get TCGPLAYER() {
    return loadProviders().TCGPLAYER;
  },
  get EBAY() {
    return loadProviders().EBAY;
  },
};

export function listProviderStatus(): ProviderStatus[] {
  const { TCGPLAYER: tcg, EBAY: ebay } = loadProviders();
  return [
    {
      id: "TCGPLAYER",
      displayName: tcg.displayName,
      health: tcg.isConfigured()
        ? { status: "READY" }
        : { status: "NOT_CONFIGURED", message: "TCGplayer integration not configured. Set TCGPLAYER_CLIENT_ID and TCGPLAYER_CLIENT_SECRET." },
    },
    {
      id: "EBAY",
      displayName: ebay.displayName,
      health: ebay.isConfigured()
        ? { status: "READY" }
        : { status: "NOT_CONFIGURED", message: "eBay integration not configured. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET." },
    },
  ];
}
