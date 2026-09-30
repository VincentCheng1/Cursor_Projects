import type { ProviderStatus } from "../types/provider";
import { EbayPriceProvider } from "./ebay";
import { TCGPlayerPriceProvider } from "./tcgplayer";

const tcg = new TCGPlayerPriceProvider();
const ebay = new EbayPriceProvider();

export const priceProviders = {
  TCGPLAYER: tcg,
  EBAY: ebay,
};

export function listProviderStatus(): ProviderStatus[] {
  return [
    {
      id: "TCGPLAYER",
      displayName: tcg.displayName,
      health: tcg.isConfigured()
        ? { status: "READY" }
        : { status: "NOT_CONFIGURED", message: "TCGplayer integration not configured." },
    },
    {
      id: "EBAY",
      displayName: ebay.displayName,
      health: ebay.isConfigured()
        ? { status: "READY" }
        : { status: "NOT_CONFIGURED", message: "eBay integration not configured." },
    },
  ];
}
