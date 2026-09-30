import { catalogProviders } from "@/lib/catalog/registry";
import { markWatermarkError, markWatermarkSuccess } from "@/lib/catalog/watermark";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";

/**
 * Discovers TCGplayer categories for Pokémon + One Piece and stores mapping metadata.
 * Does not invent cards (§5).
 */
export async function syncTcgplayerCategories() {
  const provider = catalogProviders.TCGPLAYER;
  if (!provider.isConfigured()) {
    await markWatermarkError({
      provider: "TCGPLAYER",
      surface: "categories",
      message: "TCGplayer integration not configured.",
    });
    throw new ProviderNotConfiguredError("TCGplayer");
  }

  try {
    const page = await provider.listCategories();
    const inScope = page.items.filter(
      (c) => c.gameSlug === "pokemon" || c.gameSlug === "one-piece",
    );
    await markWatermarkSuccess({
      provider: "TCGPLAYER",
      surface: "categories",
      rowCount: inScope.length,
      metadata: {
        categories: inScope.map((c) => ({
          id: c.externalCategoryId,
          name: c.name,
          gameSlug: c.gameSlug,
        })),
      },
    });
    return { processed: inScope.length, failed: 0, errors: [] as string[] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markWatermarkError({
      provider: "TCGPLAYER",
      surface: "categories",
      message,
    });
    throw error;
  }
}
