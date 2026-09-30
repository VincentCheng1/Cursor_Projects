import { tcaIsConfigured } from "@/lib/tca/config";
import { tcaFindCompletedEbaySales } from "@/lib/tca/sales";
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
 * The Card API (TCA) REST provider occupying the CardVault **EBAY** pricing slot.
 *
 * Maps completed Market `/sales` rows with `platform=ebay` into `Sale` records
 * via the existing eBay normalizer + conservative title matching. Active
 * listings and non-sale market snapshots are never written as Sale rows.
 */
export class TcaRestPriceProvider implements PriceProvider {
  readonly id = "EBAY" as const;
  readonly displayName = "The Card API (eBay comps)";

  isConfigured(): boolean {
    return tcaIsConfigured();
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError(this.displayName);
    }
  }

  async searchCards(_query: string, _options?: CardSearchOptions): Promise<CardSearchResult[]> {
    this.assertConfigured();
    // Catalogue search stays in CardVault DB; TCA Market is sales-only here.
    return [];
  }

  async getCard(externalCardId: string): Promise<ExternalCard | null> {
    this.assertConfigured();
    return { externalCardId, name: externalCardId };
  }

  async getRecentSales(card: CardIdentifier, options: SalesQueryOptions): Promise<Sale[]> {
    this.assertConfigured();
    return tcaFindCompletedEbaySales(card, options);
  }
}
