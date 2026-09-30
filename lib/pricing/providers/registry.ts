import { ebayIsConfigured } from "@/lib/ebay/config";
import { tcaIsConfigured } from "@/lib/tca/config";

import type { PriceProvider } from "../types/provider";
import type { ProviderStatus } from "../types/provider";
import { EbayPriceProvider } from "./ebay";
import { isMockProviderRuntime } from "./mock-env";
import { TcaRestPriceProvider } from "./tca-rest";
import { TCGPlayerPriceProvider } from "./tcgplayer";

let cached: { TCGPLAYER: PriceProvider; EBAY: PriceProvider } | null = null;

/**
 * EBAY pricing slot: prefer The Card API (`TCA_API_KEY`) when set — completed
 * eBay comps via Market `/sales`. Otherwise fall back to eBay Finding OAuth.
 */
export function createEbaySlotPriceProvider(): PriceProvider {
  if (tcaIsConfigured()) {
    return new TcaRestPriceProvider();
  }
  return new EbayPriceProvider();
}

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
    EBAY: createEbaySlotPriceProvider(),
  };
  return cached;
}

/** Test helper — clears the provider cache after env stubs change. */
export function resetPriceProviderCache(): void {
  cached = null;
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
  const ebayReady = ebay.isConfigured();
  let ebayMessage =
    "eBay sold comps not configured. Set TCA_API_KEY (The Card API) or EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.";
  if (!ebayReady && tcaIsConfigured()) {
    ebayMessage = "The Card API key present but provider reported not configured.";
  } else if (!ebayReady && ebayIsConfigured()) {
    ebayMessage = "eBay OAuth credentials present but Finding provider reported not configured.";
  }

  return [
    {
      id: "TCGPLAYER",
      displayName: tcg.displayName,
      health: tcg.isConfigured()
        ? { status: "READY" }
        : {
            status: "NOT_CONFIGURED",
            message:
              "TCGplayer integration not configured. Set TCGPLAYER_CLIENT_ID and TCGPLAYER_CLIENT_SECRET.",
          },
    },
    {
      id: "EBAY",
      displayName: ebay.displayName,
      health: ebayReady
        ? { status: "READY" }
        : { status: "NOT_CONFIGURED", message: ebayMessage },
    },
  ];
}
