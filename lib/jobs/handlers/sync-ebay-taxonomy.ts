import { catalogProviders } from "@/lib/catalog/registry";
import { markWatermarkError, markWatermarkSuccess } from "@/lib/catalog/watermark";
import { ProviderNotConfiguredError } from "@/lib/pricing/providers/errors";

/** Stores eBay TCG leaf category ids from the public Taxonomy API (§14b). */
export async function syncEbayTaxonomy() {
  const provider = catalogProviders.EBAY;
  if (!provider.isConfigured()) {
    await markWatermarkError({
      provider: "EBAY",
      surface: "taxonomy",
      message: "eBay integration not configured.",
    });
    throw new ProviderNotConfiguredError("eBay");
  }

  try {
    const page = await provider.listCategories();
    await markWatermarkSuccess({
      provider: "EBAY",
      surface: "taxonomy",
      rowCount: page.items.length,
      metadata: {
        leaves: page.items.map((c) => ({
          id: c.externalCategoryId,
          name: c.name,
          gameSlug: c.gameSlug,
        })),
      },
    });
    return { processed: page.items.length, failed: 0, errors: [] as string[] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markWatermarkError({ provider: "EBAY", surface: "taxonomy", message });
    throw error;
  }
}
