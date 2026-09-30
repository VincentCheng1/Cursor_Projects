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

function isConfigured(): boolean {
  const id = process.env.TCGPLAYER_CLIENT_ID;
  const secret = process.env.TCGPLAYER_CLIENT_SECRET;
  return id !== undefined && id !== "" && secret !== undefined && secret !== "";
}

/** Production TCGplayer provider — disabled until authorized credentials exist (spec §12). */
export class TCGPlayerPriceProvider implements PriceProvider {
  readonly id = "TCGPLAYER" as const;
  readonly displayName = "TCGplayer";

  isConfigured(): boolean {
    return isConfigured();
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError(this.displayName);
    }
  }

  async searchCards(_query: string, _options?: CardSearchOptions): Promise<CardSearchResult[]> {
    this.assertConfigured();
    return [];
  }

  async getCard(_externalCardId: string): Promise<ExternalCard | null> {
    this.assertConfigured();
    return null;
  }

  async getRecentSales(_card: CardIdentifier, _options: SalesQueryOptions): Promise<Sale[]> {
    this.assertConfigured();
    return [];
  }
}
