import { ebayFindCompletedSales } from "@/lib/ebay/finding";
import { ebayIsConfigured } from "@/lib/ebay/config";
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

/** Production eBay provider — completed/sold listings only (spec §14). */
export class EbayPriceProvider implements PriceProvider {
  readonly id = "EBAY" as const;
  readonly displayName = "eBay";

  isConfigured(): boolean {
    return ebayIsConfigured();
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError(this.displayName);
    }
  }

  async searchCards(_query: string, _options?: CardSearchOptions): Promise<CardSearchResult[]> {
    this.assertConfigured();
    // eBay is used for completed sales only; catalogue search stays in CardVault DB (§14).
    return [];
  }

  async getCard(externalCardId: string): Promise<ExternalCard | null> {
    this.assertConfigured();
    return { externalCardId, name: externalCardId };
  }

  async getRecentSales(card: CardIdentifier, options: SalesQueryOptions): Promise<Sale[]> {
    this.assertConfigured();
    return ebayFindCompletedSales(card, options);
  }
}
