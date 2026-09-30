import { refreshCardPrice } from "@/lib/pricing/services/refresh-card-price";
import type { PricingIdentity } from "@/lib/pricing/services/match-criteria";

/** Persists PriceSnapshot rows on successful refresh (§30). */
export async function snapshotPriceJob(identity: PricingIdentity) {
  const result = await refreshCardPrice(identity);
  return {
    processed: result.snapshotsWritten ? 1 : 0,
    failed: result.snapshotsWritten ? 0 : 1,
    errors: result.providerErrors,
    result,
  };
}
