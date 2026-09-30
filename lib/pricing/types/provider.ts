import type { CardIdentifier } from "./card";
import type { Sale, SaleSource } from "./sale";

export type ProviderId = SaleSource;

export interface CardSearchOptions {
  game?: string;
  setName?: string;
  limit?: number;
  offset?: number;
}

export interface CardSearchResult {
  externalCardId: string;
  name: string;
  setName?: string;
  cardNumber?: string;
  rarity?: string;
  imageUrl?: string;
  game?: string;
}

export interface ExternalCard extends CardSearchResult {
  variants?: Array<{
    externalVariantId?: string;
    variantName: string;
    printing?: string;
    language?: string;
  }>;
}

export interface SalesQueryOptions {
  /** Only sales on or after this date. */
  since?: Date;
  /** Upper bound on records fetched. The engine still only averages the newest 20. */
  limit?: number;
  condition?: string;
  gradingCompany?: string;
  grade?: string;
  language?: string;
}

/**
 * The single seam between CardVault and any marketplace (spec §11).
 *
 * Providers normalize their own responses into the common `Sale` shape; the
 * calculation engine never sees a TCGplayer or eBay payload.
 */
export interface PriceProvider {
  readonly id: ProviderId;
  readonly displayName: string;

  /** False when credentials are absent — the provider then disables itself (spec §12). */
  isConfigured(): boolean;

  searchCards(query: string, options?: CardSearchOptions): Promise<CardSearchResult[]>;

  getCard(externalCardId: string): Promise<ExternalCard | null>;

  getRecentSales(card: CardIdentifier, options: SalesQueryOptions): Promise<Sale[]>;
}

export type ProviderHealth =
  | { status: "READY" }
  | { status: "NOT_CONFIGURED"; message: string }
  | { status: "UNAVAILABLE"; message: string };

export interface ProviderStatus {
  id: ProviderId;
  displayName: string;
  health: ProviderHealth;
}
