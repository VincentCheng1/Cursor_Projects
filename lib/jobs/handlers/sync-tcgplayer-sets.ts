import { catalogProviders } from "@/lib/catalog/registry";
import { resolveGameId, upsertCatalogSet } from "@/lib/catalog/upsert";
import { getWatermark, markWatermarkError, markWatermarkSuccess } from "@/lib/catalog/watermark";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";

type CategoryMeta = { id: string; name: string; gameSlug?: string };

/**
 * Walks all TCGplayer groups (sets) for in-scope categories — exhaustive pagination (§14b).
 */
export async function syncTcgplayerSets() {
  const provider = catalogProviders.TCGPLAYER;
  if (!provider.isConfigured()) {
    await markWatermarkError({
      provider: "TCGPLAYER",
      surface: "sets",
      message: "TCGplayer integration not configured.",
    });
    throw new ProviderNotConfiguredError("TCGplayer");
  }

  const catWm = await getWatermark("TCGPLAYER", "categories");
  const meta = catWm?.metadata as { categories?: CategoryMeta[] } | null;
  let categories = meta?.categories ?? [];

  if (categories.length === 0) {
    const page = await provider.listCategories();
    categories = page.items
      .filter((c) => c.gameSlug === "pokemon" || c.gameSlug === "one-piece")
      .map((c) => ({ id: c.externalCategoryId, name: c.name, gameSlug: c.gameSlug }));
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];
  const setIdMap: Record<
    string,
    { gameSlug: string; code: string; name: string; categoryId: string }
  > = {};

  try {
    for (const category of categories) {
      const gameSlug = category.gameSlug;
      if (gameSlug === undefined) continue;
      const gameId = await resolveGameId(gameSlug);
      if (gameId === null) {
        errors.push(`Game not seeded: ${gameSlug}`);
        failed += 1;
        continue;
      }

      let offset = 0;
      for (;;) {
        const page = await provider.listSets({
          categoryId: category.id,
          gameSlug,
          offset,
          limit: 100,
        });
        for (const set of page.items) {
          try {
            await upsertCatalogSet({ gameId, set });
            setIdMap[set.externalSetId] = {
              gameSlug,
              code: set.code,
              name: set.name,
              categoryId: category.id,
            };
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

    await markWatermarkSuccess({
      provider: "TCGPLAYER",
      surface: "sets",
      rowCount: processed,
      metadata: { externalSetIds: setIdMap },
    });
    return { processed, failed, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markWatermarkError({ provider: "TCGPLAYER", surface: "sets", message });
    throw error;
  }
}
