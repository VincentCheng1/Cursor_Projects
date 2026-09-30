import { getPrisma } from "@/lib/db/client";
import { markWatermarkError, markWatermarkSuccess } from "@/lib/catalog/watermark";
import { ebayIsConfigured } from "@/lib/ebay/config";
import { ebayFindCompletedSales } from "@/lib/ebay/finding";
import { upsertSalesForCard } from "@/lib/pricing/persist/upsert-sales";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";
import type { CardIdentifier } from "@/lib/pricing/types/card";

/**
 * Pulls completed/sold listings for catalog cards via authorized Finding API (§14 / §14b).
 * Matching stays conservative — persistence skips unattributed rows (§16).
 * Never invents sales; active listings are never requested.
 */
export async function syncEbaySoldListings() {
  if (!ebayIsConfigured()) {
    await markWatermarkError({
      provider: "EBAY",
      surface: "sold_listings",
      message: "eBay integration not configured.",
    });
    throw new ProviderNotConfiguredError("eBay");
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const cards = await getPrisma().card.findMany({
      include: {
        set: true,
        game: true,
        variants: { take: 1, orderBy: { createdAt: "asc" } },
      },
      take: 200,
      orderBy: { updatedAt: "desc" },
    });

    for (const card of cards) {
      const variant = card.variants[0];
      const identity: CardIdentifier = {
        cardId: card.id,
        variantId: variant?.id,
        game: card.game.slug,
        cardName: card.name,
        setName: card.set.name,
        setCode: card.set.code,
        cardNumber: card.cardNumber,
        variantName: variant?.variantName,
        printing: variant?.printing ?? undefined,
        language: variant?.language ?? "EN",
        externalIds:
          card.externalIds !== null && typeof card.externalIds === "object"
            ? (card.externalIds as { tcgplayer?: string; ebay?: string })
            : undefined,
      };

      try {
        const sales = await ebayFindCompletedSales(identity, { limit: 50 });
        const result = await upsertSalesForCard(sales, card.id, variant?.id);
        processed += result.processed;
        failed += result.failed;
      } catch (e) {
        failed += 1;
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    await markWatermarkSuccess({
      provider: "EBAY",
      surface: "sold_listings",
      rowCount: processed,
    });
    return { processed, failed, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markWatermarkError({
      provider: "EBAY",
      surface: "sold_listings",
      message,
    });
    throw error;
  }
}
