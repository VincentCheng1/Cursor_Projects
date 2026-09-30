import { buildMatchCriteria, type PricingIdentity } from "@/lib/pricing/services/match-criteria";
import { upsertSalesForCard } from "@/lib/pricing/persist/upsert-sales";
import { priceProviders } from "@/lib/pricing/providers/registry";

import { cardIdentifierFromIdentity } from "../card-context";

export async function syncCardSales(identity: PricingIdentity) {
  const match = buildMatchCriteria(identity);
  const card = cardIdentifierFromIdentity(identity);
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const source of ["TCGPLAYER", "EBAY"] as const) {
    const provider = priceProviders[source];
    if (!provider.isConfigured()) continue;

    try {
      const sales = await provider.getRecentSales(card, {
        condition: match.condition,
        gradingCompany: match.gradingCompany,
        grade: match.grade,
        language: match.language,
        limit: 100,
      });
      const result = await upsertSalesForCard(
        sales,
        identity.card.id,
        identity.variant?.id,
      );
      processed += result.processed;
      failed += result.failed;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      failed += 1;
    }
  }

  return { processed, failed, errors };
}
