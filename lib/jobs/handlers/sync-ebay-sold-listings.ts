import { getPrisma } from "@/lib/db/client";
import { markWatermarkError, markWatermarkSuccess } from "@/lib/catalog/watermark";
import { ebayIsConfigured } from "@/lib/ebay/config";
import { ebayFindCompletedSales } from "@/lib/ebay/finding";
import { upsertSalesForCard } from "@/lib/pricing/persist/upsert-sales";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";
import type { CardIdentifier } from "@/lib/pricing/types/card";
import { tcaIsConfigured } from "@/lib/tca/config";
import { tcaFindCompletedEbaySales } from "@/lib/tca/sales";

/**
 * Pulls completed/sold eBay comps for catalog cards (§14 / §14b).
 *
 * Prefer The Card API (`TCA_API_KEY`) Market `/sales?platform=ebay` when set;
 * otherwise use the authorized eBay Finding API. Matching stays conservative —
 * persistence skips unattributed rows (§16). Never invents sales; active
 * listings are never requested.
 */
export async function syncEbaySoldListings() {
  const useTca = tcaIsConfigured();
  const useEbayOauth = ebayIsConfigured();
  if (!useTca && !useEbayOauth) {
    await markWatermarkError({
      provider: "EBAY",
      surface: "sold_listings",
      message: "eBay sold comps not configured (set TCA_API_KEY or EBAY_CLIENT_ID/SECRET).",
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
        const sales = useTca
          ? await tcaFindCompletedEbaySales(identity, { limit: 50 })
          : await ebayFindCompletedSales(identity, { limit: 50 });
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
    return { processed, failed, errors, source: useTca ? "TCA" : "EBAY_FINDING" };
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
