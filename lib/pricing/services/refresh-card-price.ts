import type { PriceSource } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";

import type { AverageResult } from "../types/calculation";
import type { SaleSource } from "../types/sale";
import { computeCardPrice } from "./compute-card-price";
import type { PricingIdentity } from "./match-criteria";

export interface RefreshCardPriceResult {
  combined: AverageResult;
  bySource: Partial<Record<SaleSource, AverageResult>>;
  snapshotsWritten: boolean;
  providerErrors: string[];
  usedStoredSalesOnly: boolean;
}

async function writeSnapshot(
  identity: PricingIdentity,
  source: PriceSource,
  result: AverageResult,
): Promise<void> {
  if (result.status !== "CALCULATED") return;

  await getPrisma().priceSnapshot.create({
    data: {
      cardId: identity.card.id,
      variantId: identity.variant?.id ?? null,
      source,
      condition: identity.condition,
      gradingCompany: identity.gradingCompany,
      grade: identity.grade ?? null,
      currency: result.currency,
      averagePrice: result.average,
      medianPrice: result.median,
      minimumPrice: result.minimum,
      maximumPrice: result.maximum,
      salesUsed: result.salesUsed,
      salesAvailable: result.salesAvailable,
      oldestSaleDate: result.oldestSaleDate,
      newestSaleDate: result.newestSaleDate,
      calculatedAt: new Date(),
    },
  });
}

/**
 * Refreshes pricing from configured providers plus stored sales, then snapshots (§30, §31).
 *
 * Never writes a snapshot when status is INSUFFICIENT_DATA, so the last good value remains.
 */
export async function refreshCardPrice(identity: PricingIdentity): Promise<RefreshCardPriceResult> {
  const { combined, bySource, providerErrors, usedStoredSalesOnly } =
    await computeCardPrice(identity);

  let snapshotsWritten = false;
  if (combined.status === "CALCULATED") {
    await writeSnapshot(identity, "COMBINED", combined);
    snapshotsWritten = true;
    for (const source of ["TCGPLAYER", "EBAY"] as const) {
      const perSource = bySource[source];
      if (perSource?.status === "CALCULATED") {
        await writeSnapshot(identity, source, perSource);
      }
    }
  }

  return {
    combined,
    bySource,
    snapshotsWritten,
    providerErrors,
    usedStoredSalesOnly,
  };
}
