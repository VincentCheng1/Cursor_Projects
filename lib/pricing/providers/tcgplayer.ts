import { getPrisma } from "@/lib/db/client";
import {
  tcgplayerFetchSalesHistory,
  tcgplayerGetProduct,
  tcgplayerSearchProducts,
} from "@/lib/tcgplayer/client";
import { tcgplayerIsConfigured } from "@/lib/tcgplayer/config";
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

async function hydrateExternalIds(card: CardIdentifier): Promise<CardIdentifier> {
  if (card.externalIds?.tcgplayer !== undefined || card.cardId === undefined) return card;
  const row = await getPrisma().card.findUnique({
    where: { id: card.cardId },
    select: { externalIds: true },
  });
  if (row?.externalIds === null || row?.externalIds === undefined) return card;
  const ids = row.externalIds as { tcgplayer?: string; ebay?: string };
  return { ...card, externalIds: ids };
}

/** Production TCGplayer provider — authorized API only (spec §12–§13). */
export class TCGPlayerPriceProvider implements PriceProvider {
  readonly id = "TCGPLAYER" as const;
  readonly displayName = "TCGplayer";

  isConfigured(): boolean {
    return tcgplayerIsConfigured();
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError(this.displayName);
    }
  }

  async searchCards(query: string, options?: CardSearchOptions): Promise<CardSearchResult[]> {
    this.assertConfigured();
    const results = await tcgplayerSearchProducts(query, options);
    return results.map((p) => ({
      externalCardId: String(p.productId ?? ""),
      name: p.name ?? p.cleanName ?? "Unknown",
      setName: p.groupName,
      cardNumber: p.number,
      rarity: p.rarity,
      imageUrl: p.imageUrl,
    }));
  }

  async getCard(externalCardId: string): Promise<ExternalCard | null> {
    this.assertConfigured();
    const product = await tcgplayerGetProduct(externalCardId);
    if (product === null || product === undefined) return null;
    return {
      externalCardId,
      name: product.name ?? product.cleanName ?? "Unknown",
      setName: product.groupName,
      cardNumber: product.number,
      rarity: product.rarity,
      imageUrl: product.imageUrl,
    };
  }

  async getRecentSales(card: CardIdentifier, options: SalesQueryOptions): Promise<Sale[]> {
    this.assertConfigured();
    const hydrated = await hydrateExternalIds(card);
    const productId = hydrated.externalIds?.tcgplayer;
    if (productId === undefined || productId === "") {
      return [];
    }
    return tcgplayerFetchSalesHistory(productId, hydrated, options);
  }
}
