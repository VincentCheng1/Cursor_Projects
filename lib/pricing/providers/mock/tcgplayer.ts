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
import { buildMockTcgSales } from "./fixtures";

export class MockTCGPlayerProvider implements PriceProvider {
  readonly id = "TCGPLAYER" as const;
  readonly displayName = "Mock TCGplayer";

  constructor() {
    assertMockProviderEnvironment();
  }

  isConfigured(): boolean {
    return true;
  }

  async searchCards(query: string, _options?: CardSearchOptions): Promise<CardSearchResult[]> {
    return [
      {
        externalCardId: "mock-tcg-card",
        name: query,
        game: "pokemon",
        setName: "Base Set",
        cardNumber: "4/102",
      },
    ];
  }

  async getCard(externalCardId: string): Promise<ExternalCard | null> {
    return {
      externalCardId,
      name: "Charizard",
      setName: "Base Set",
      cardNumber: "4/102",
    };
  }

  async getRecentSales(_card: CardIdentifier, options: SalesQueryOptions): Promise<Sale[]> {
    const limit = options.limit ?? 25;
    return buildMockTcgSales(Math.min(limit, 25));
  }
}
