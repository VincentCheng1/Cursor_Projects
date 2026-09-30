import { tcgcsvIsEnabled } from "@/lib/tcgcsv/config";
import type { CardIdentifier } from "../types/card";
import type {
  CardSearchOptions,
  CardSearchResult,
  ExternalCard,
  PriceProvider,
  SalesQueryOptions,
} from "../types/provider";
import type { Sale } from "../types/sale";
import { ProviderNotConfiguredError } from "./errors";

/**
 * TCGCSV-backed TCGplayer price slot.
 *
 * TCGCSV publishes catalog + market/mid/low/high listing aggregates — **not**
 * completed sales. `getRecentSales` therefore always returns `[]` (fail closed
 * for the §3 / §22 20-sale engine). Use catalog sync `referenceMarketPrice`
 * for market/mid snapshots; official TCGplayer / eBay sales APIs remain
 * required for true combined value.
 */
export class TcgCsvPriceProvider implements PriceProvider {
  readonly id = "TCGPLAYER" as const;
  readonly displayName = "TCGCSV (market reference — no sales history)";

  isConfigured(): boolean {
    return tcgcsvIsEnabled();
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError("TCGCSV");
    }
  }

  async searchCards(
    _query: string,
    _options?: CardSearchOptions,
  ): Promise<CardSearchResult[]> {
    this.assertConfigured();
    // No search endpoint on TCGCSV — CardVault card search uses the local catalog DB.
    return [];
  }

  async getCard(_externalCardId: string): Promise<ExternalCard | null> {
    this.assertConfigured();
    // No product-by-id endpoint — fail closed.
    return null;
  }

  async getRecentSales(
    _card: CardIdentifier,
    _options: SalesQueryOptions,
  ): Promise<Sale[]> {
    this.assertConfigured();
    // Honest gap: TCGCSV has no completed-sales feed (see tcgcsv.com/faq).
    return [];
  }
}
