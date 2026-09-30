import { catalogProviderConfigured } from "@/lib/catalog/registry";

import { syncEbayCatalogLinks } from "./sync-ebay-catalog-links";
import { syncEbaySoldListings } from "./sync-ebay-sold-listings";
import { syncEbayTaxonomy } from "./sync-ebay-taxonomy";
import { syncTcgplayerCategories } from "./sync-tcgplayer-categories";
import { syncTcgplayerProducts } from "./sync-tcgplayer-products";
import { syncTcgplayerSets } from "./sync-tcgplayer-sets";

export type JobOutcome = { processed: number; failed: number; errors?: string[] };

/**
 * Orchestrates all Phase 13a public-data surfaces that are configured.
 * Unconfigured providers are skipped (reported as disabled) — never scraped (§14b).
 */
export async function syncPublicData(): Promise<JobOutcome> {
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  const steps: Array<{ name: string; enabled: boolean; run: () => Promise<JobOutcome> }> = [
    {
      name: "syncTcgplayerCategories",
      enabled: catalogProviderConfigured("TCGPLAYER"),
      run: syncTcgplayerCategories,
    },
    {
      name: "syncTcgplayerSets",
      enabled: catalogProviderConfigured("TCGPLAYER"),
      run: syncTcgplayerSets,
    },
    {
      name: "syncTcgplayerProducts",
      enabled: catalogProviderConfigured("TCGPLAYER"),
      run: syncTcgplayerProducts,
    },
    {
      name: "syncEbayTaxonomy",
      enabled: catalogProviderConfigured("EBAY"),
      run: syncEbayTaxonomy,
    },
    {
      name: "syncEbayCatalogLinks",
      enabled: catalogProviderConfigured("EBAY"),
      run: syncEbayCatalogLinks,
    },
    {
      name: "syncEbaySoldListings",
      enabled: catalogProviderConfigured("EBAY"),
      run: syncEbaySoldListings,
    },
  ];

  const enabled = steps.filter((s) => s.enabled);
  if (enabled.length === 0) {
    return {
      processed: 0,
      failed: 0,
      errors: [
        "No marketplace public data providers configured. Set TCGplayer and/or eBay credentials — HTML scraping is not available.",
      ],
    };
  }

  for (const step of enabled) {
    try {
      const outcome = await step.run();
      processed += outcome.processed;
      failed += outcome.failed;
      if (outcome.errors?.length) errors.push(...outcome.errors.map((e) => `${step.name}: ${e}`));
    } catch (e) {
      failed += 1;
      errors.push(`${step.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { processed, failed, errors };
}
