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

  async getRecentSales(card: CardIdentifier, options: SalesQueryOptions): Promise<Sale[]> {
    // Oversample fixtures (includes recent non-qualifying), then filter before limit.
    const all = attachCardToSales(buildMockTcgSales(40), card);
    const filtered = filterSalesByQueryOptions(all, options);
    const limit = options.limit ?? 25;
    return takeRecentSales(filtered, limit);
  }
}
