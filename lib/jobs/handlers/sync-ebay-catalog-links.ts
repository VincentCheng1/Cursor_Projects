import { getPrisma } from "@/lib/db/client";
import { catalogProviders } from "@/lib/catalog/registry";
import { linkEbayExternalId } from "@/lib/catalog/upsert";
import { getWatermark, markWatermarkError, markWatermarkSuccess } from "@/lib/catalog/watermark";
import { aspectValue, extractEbayProductLink } from "@/lib/ebay/browse";
import { ebayBrowseSearch } from "@/lib/ebay/browse";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";

/**
 * Links eBay EPIDs / product ids onto existing catalog cards via Browse API (§14b).
 * Never invents cards — only enriches rows already in Postgres.
 * Conservative: requires card number (or name+set) aspect agreement before linking.
 */
export async function syncEbayCatalogLinks() {
  const provider = catalogProviders.EBAY;
  if (!provider.isConfigured()) {
    await markWatermarkError({
      provider: "EBAY",
      surface: "catalog_links",
      message: "eBay integration not configured.",
    });
    throw new ProviderNotConfiguredError("eBay");
  }

  const taxWm = await getWatermark("EBAY", "taxonomy");
  const leaves =
    (taxWm?.metadata as { leaves?: Array<{ id: string; gameSlug?: string }> } | null)?.leaves ??
    [];

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Work from local catalog — do not create cards from browse hits alone (§5).
    const cards = await getPrisma().card.findMany({
      include: { set: true, game: true },
      take: 500,
      orderBy: { updatedAt: "asc" },
    });

    for (const card of cards) {
      const q = [card.name, card.set.name, card.cardNumber].filter(Boolean).join(" ");
      if (q.trim() === "") continue;

      const categoryIds = leaves
        .filter((l) => l.gameSlug === card.game.slug || l.gameSlug === undefined)
        .map((l) => l.id)
        .slice(0, 5);

      try {
        const page = await ebayBrowseSearch({
          q,
          categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
          limit: 10,
        });

        for (const item of page.items) {
          const aspectNumber = aspectValue(item, [
            "Card Number",
            "Card number",
            "Number",
          ]);
          const aspectName = aspectValue(item, ["Character", "Card Name", "Name"]);
          const numberOk =
            aspectNumber === null ||
            aspectNumber.replace(/\s/g, "").toLowerCase() ===
              card.cardNumber.replace(/\s/g, "").toLowerCase();
          const nameOk =
            aspectName === null ||
            aspectName.toLowerCase().includes(card.name.toLowerCase()) ||
            card.name.toLowerCase().includes(aspectName.toLowerCase());

          // Conservative: if aspects present they must agree; title fallback requires number.
          const title = item.title ?? "";
          const titleHasNumber = title.toLowerCase().includes(card.cardNumber.toLowerCase());
          if (!numberOk || !nameOk) continue;
          if (aspectNumber === null && !titleHasNumber) continue;

          const link = extractEbayProductLink(item);
          if (link === null) continue;
          await linkEbayExternalId(card.id, link);
          processed += 1;
          break;
        }
      } catch (e) {
        failed += 1;
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    // Also exercise CatalogProvider.listProducts for configured game keywords (coverage).
    for (const gameSlug of ["pokemon", "one-piece"] as const) {
      try {
        await provider.listProducts({ gameSlug, limit: 5 });
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    await markWatermarkSuccess({
      provider: "EBAY",
      surface: "catalog_links",
      rowCount: processed,
    });
    return { processed, failed, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markWatermarkError({
      provider: "EBAY",
      surface: "catalog_links",
      message,
    });
    throw error;
  }
}
