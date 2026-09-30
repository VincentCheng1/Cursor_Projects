import { tcgcsvServesTcgplayerSlot } from "@/lib/tcgcsv/config";

import type { PriceProvider, ProviderHealth, ProviderStatus } from "../types/provider";
import { EbayPriceProvider } from "./ebay";
import { isMockProviderRuntime } from "./mock-env";
import { TcgCsvPriceProvider } from "./tcgcsv";
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
    TCGPLAYER: tcgcsvServesTcgplayerSlot()
      ? new TcgCsvPriceProvider()
      : new TCGPlayerPriceProvider(),
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

/** Test helper — clears provider singleton. */
export function resetPriceProviderCache(): void {
  cached = null;
}

/**
 * Operator-facing health for the TCGPLAYER price slot.
 * TCGCSV can be configured for catalog/reference but must never report READY for sales.
 */
export function tcgplayerPriceSlotHealth(options: {
  configured: boolean;
  usingTcgCsv: boolean;
}): ProviderHealth {
  if (!options.configured) {
    return {
      status: "NOT_CONFIGURED",
      message: options.usingTcgCsv
        ? "TCGCSV integration not configured. Set CARDVAULT_PRICE_SOURCE=tcgcsv or TCGCSV_ENABLED=1 (no marketplace secrets required)."
        : "TCGplayer integration not configured. Set TCGPLAYER_CLIENT_ID and TCGPLAYER_CLIENT_SECRET, or enable TCGCSV via CARDVAULT_PRICE_SOURCE=tcgcsv.",
    };
  }
  if (options.usingTcgCsv) {
    return {
      status: "UNAVAILABLE",
      message:
        "TCGCSV catalog/reference only — no completed-sales feed. Sales pricing (§3 / §22) stays unavailable until official TCGplayer or eBay sales APIs are configured.",
    };
  }
  return { status: "READY" };
}

export function listProviderStatus(): ProviderStatus[] {
  const { TCGPLAYER: tcg, EBAY: ebay } = loadProviders();
  const tcgCsv = tcgcsvServesTcgplayerSlot();
  return [
    {
      id: "TCGPLAYER",
      displayName: tcg.displayName,
      health: tcgplayerPriceSlotHealth({
        configured: tcg.isConfigured(),
        usingTcgCsv: tcgCsv,
      }),
    },
    {
      id: "EBAY",
      displayName: ebay.displayName,
      health: ebay.isConfigured()
        ? { status: "READY" }
        : {
            status: "NOT_CONFIGURED",
            message:
              "eBay integration not configured. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.",
          },
    },
  ];
}
