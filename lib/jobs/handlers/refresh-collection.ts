import { listCollectionItems } from "@/lib/collection/service";
import { resolvePricingIdentity } from "@/lib/cards/resolve-identity";

import { snapshotPriceJob } from "./snapshot-price";
import { syncCardSales } from "./sync-card-sales";

export async function refreshCollectionJob(userId: string) {
  const items = await listCollectionItems(userId);
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of items) {
    const identity = await resolvePricingIdentity({
      cardId: item.cardId,
      variantId: item.variantId ?? undefined,
      condition: item.condition,
      gradingCompany: item.gradingCompany,
      grade: item.grade ?? undefined,
    });
    if (identity === null) {
      failed += 1;
      continue;
    }

    const sync = await syncCardSales(identity);
    processed += sync.processed;
    failed += sync.failed;
    errors.push(...sync.errors);

    const snap = await snapshotPriceJob(identity);
    processed += snap.processed;
    failed += snap.failed;
    errors.push(...snap.errors);
  }

  return { processed, failed, errors };
}
