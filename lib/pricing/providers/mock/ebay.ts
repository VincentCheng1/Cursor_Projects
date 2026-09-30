import type { CardIdentifier } from "../../types/card";
import type {
  CardSearchOptions,
  CardSearchResult,
  ExternalCard,
  PriceProvider,
  SalesQueryOptions,
} from "../../types/provider";
import type { Sale } from "../../types/sale";
import { assertMockProviderEnvironment } from "./guard";
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

  async getRecentSales(_card: CardIdentifier, _options: SalesQueryOptions): Promise<Sale[]> {
    return buildMockEbaySales();
  }
}
