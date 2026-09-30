import { getLatestPricesForCard } from "@/lib/pricing/services/latest-prices";

import type { listCollectionItems } from "./service";

type CollectionItem = Awaited<ReturnType<typeof listCollectionItems>>[number];

export async function enrichCollectionItem(item: CollectionItem) {
  const latest = await getLatestPricesForCard({
    cardId: item.cardId,
    variantId: item.variantId,
    condition: item.condition,
    gradingCompany: item.gradingCompany,
    grade: item.grade,
  });
  const combined = latest.COMBINED;
  return {
    ...item,
    pricing: {
      currentValue: combined?.averagePrice ?? null,
      salesUsed: combined?.salesUsed ?? 0,
      lastUpdated: combined?.calculatedAt ?? null,
      status: combined?.status ?? "INSUFFICIENT_DATA",
    },
  };
}
