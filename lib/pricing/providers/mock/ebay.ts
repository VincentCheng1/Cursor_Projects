import type { CardIdentifier } from "../../types/card";
import type {
  CardSearchOptions,
  CardSearchResult,
  ExternalCard,
  PriceProvider,
  SalesQueryOptions,
} from "../../types/provider";
import type { Sale } from "../../types/sale";
import {
  filterSalesByQueryOptions,
  takeRecentSales,
} from "../../services/sale-query";
import { assertMockProviderEnvironment } from "./guard";
import { attachCardToSales } from "./attach-card";
import { buildMockEbaySales } from "./fixtures";

export class MockEbayProvider implements PriceProvider {
  readonly id = "EBAY" as const;
  readonly displayName = "Mock eBay";

  constructor() {
    assertMockProviderEnvironment();
  }

  isConfigured(): boolean {
    return true;
  }

  async searchCards(query: string): Promise<CardSearchResult[]> {
    return [
      {
        externalCardId: "mock-ebay-card",
        name: query,
        game: "pokemon",
      },
    ];
  }

  async getCard(externalCardId: string): Promise<ExternalCard | null> {
    return { externalCardId, name: "Charizard" };
  }

  async getRecentSales(card: CardIdentifier, options: SalesQueryOptions): Promise<Sale[]> {
    const all = attachCardToSales(buildMockEbaySales(), card);
    const filtered = filterSalesByQueryOptions(all, options);
    const limit = options.limit ?? 25;
    return takeRecentSales(filtered, limit);
  }
}
