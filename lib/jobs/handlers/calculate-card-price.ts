import { computeCardPrice } from "@/lib/pricing/services/compute-card-price";
import type { PricingIdentity } from "@/lib/pricing/services/match-criteria";

/** Runs the pricing engine without writing snapshots (§57). */
export async function calculateCardPriceJob(identity: PricingIdentity) {
  const result = await computeCardPrice(identity);
  const ok = result.combined.status === "CALCULATED" ? 1 : 0;
  return {
    processed: ok,
    failed: ok === 1 ? 0 : 1,
    errors: result.providerErrors,
    result,
  };
}
