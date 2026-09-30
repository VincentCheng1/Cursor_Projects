import { getPrisma } from "@/lib/db/client";
import { catalogProviders } from "@/lib/catalog/registry";
import {
  resolveGameId,
  upsertCatalogProduct,
  upsertCatalogSet,
  upsertCatalogVariants,
} from "@/lib/catalog/upsert";
import { getWatermark, markWatermarkError, markWatermarkSuccess } from "@/lib/catalog/watermark";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";

type SetMeta = Record<
  string,
  { gameSlug: string; code: string; name: string; categoryId?: string }
>;

/**
 * Exhausts all products + variants for synced TCGplayer sets (§14b).
 * Idempotent upserts; never invents cards outside API responses (§5).
 * When the TCGPLAYER slot is served by TCGCSV, market/mid land on variants as
 * reference-only fields — never as §3 / §22 completed-sale averages.
 */
export async function syncTcgplayerProducts() {
  const provider = catalogProviders.TCGPLAYER;
  if (!provider.isConfigured()) {
    await markWatermarkError({
      provider: "TCGPLAYER",
      surface: "products",
      message: "TCGplayer integration not configured.",
    });
    throw new ProviderNotConfiguredError("TCGplayer");
  }

  const setsWm = await getWatermark("TCGPLAYER", "sets");
  const setMap: SetMeta = {
    ...((setsWm?.metadata as { externalSetIds?: SetMeta } | null)?.externalSetIds ?? {}),
  };

  // Fallback: if sets watermark missing map, re-list sets from categories.
  if (Object.keys(setMap).length === 0) {
    const catWm = await getWatermark("TCGPLAYER", "categories");
    const categories =
      (catWm?.metadata as { categories?: Array<{ id: string; gameSlug?: string }> } | null)
        ?.categories ?? [];
    for (const category of categories) {
      if (category.gameSlug === undefined) continue;
      let offset = 0;
      for (;;) {
        const page = await provider.listSets({
          categoryId: category.id,
          gameSlug: category.gameSlug,
          offset,
          limit: 100,
        });
        for (const set of page.items) {
          setMap[set.externalSetId] = {
            gameSlug: category.gameSlug,
            code: set.code,
            name: set.name,
            categoryId: category.id,
          };
        }
        if (page.nextOffset === null || page.nextOffset === undefined) break;
        offset = page.nextOffset;
      }
    }
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    for (const [externalSetId, info] of Object.entries(setMap)) {
      const gameId = await resolveGameId(info.gameSlug);
      if (gameId === null) {
        failed += 1;
        errors.push(`Game not seeded: ${info.gameSlug}`);
        continue;
      }

      const { setId } = await upsertCatalogSet({
        gameId,
        set: {
          externalSetId,
          externalCategoryId: info.categoryId ?? "",
          name: info.name,
          code: info.code,
          gameSlug: info.gameSlug,
        },
      });

      let offset = 0;
      for (;;) {
        const page = await provider.listProducts({
          setId: externalSetId,
          categoryId: info.categoryId,
          gameSlug: info.gameSlug,
          offset,
          limit: 100,
        });

        for (const product of page.items) {
          try {
            const { cardId } = await upsertCatalogProduct({
              gameId,
              setId,
              product,
              marketplace: "tcgplayer",
            });
            const variants =
              product.variants ?? (await provider.listVariants(product.externalProductId));
            await upsertCatalogVariants(cardId, variants);
            processed += 1;
          } catch (e) {
            failed += 1;
            errors.push(e instanceof Error ? e.message : String(e));
          }
        }

        if (page.nextOffset === null || page.nextOffset === undefined) break;
        offset = page.nextOffset;
      }
    }

    const cardCount = await getPrisma().card.count();

    await markWatermarkSuccess({
      provider: "TCGPLAYER",
      surface: "products",
      rowCount: processed,
      metadata: { lastCardCount: cardCount },
    });
    return { processed, failed, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markWatermarkError({ provider: "TCGPLAYER", surface: "products", message });
    throw error;
  }
}
