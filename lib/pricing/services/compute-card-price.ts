import { getPrisma } from "@/lib/db/client";

import { calculateCombinedValue } from "../calculator/calculateCombinedValue";
import { mapDbSaleToPricingSale } from "../mappers/db-sale";
import { priceProviders } from "../providers/registry";
import type { RefreshCardPriceResult } from "./refresh-card-price";
import { buildMatchCriteria, type PricingIdentity } from "./match-criteria";
import {
  buildDbSaleWhere,
  DB_SALE_FETCH_LIMIT,
  PROVIDER_QUALIFYING_LIMIT,
} from "./sale-query";

/** Read-only pricing calculation (no snapshots). */
export async function computeCardPrice(
  identity: PricingIdentity,
): Promise<Omit<RefreshCardPriceResult, "snapshotsWritten">> {
  const match = buildMatchCriteria(identity);
  // Filter identity/condition/grading in SQL before LIMIT so mixed-condition
  // history cannot starve the qualifying window (pricing-pipeline audit P1 #5).
  const rows = await getPrisma().sale.findMany({
    where: buildDbSaleWhere(identity),
    orderBy: { saleDate: "desc" },
    take: DB_SALE_FETCH_LIMIT,
  });
  // Pass catalog variant phrases so eBay DB rows can re-prove a stored
  // variantId from the listing title (without inventing marketplace data).
  const remapContext = {
    variantId: identity.variant?.id,
    variantName: identity.variant?.variantName,
    printing: identity.variant?.printing ?? undefined,
  };
  const dbSales = rows.map((row) => mapDbSaleToPricingSale(row, remapContext));

  const cardIdentifier = {
    cardId: identity.card.id,
    variantId: identity.variant?.id,
    game: identity.card.set.game.slug,
    cardName: identity.card.name,
    setName: identity.card.set.name,
    setCode: identity.card.set.code,
    cardNumber: identity.card.cardNumber,
    variantName: identity.variant?.variantName,
    printing: identity.variant?.printing ?? undefined,
    language: identity.variant?.language,
  };

  const providerSales: Partial<Record<"TCGPLAYER" | "EBAY", import("../types/sale").Sale[]>> =
    {};
  const errors: string[] = [];

  for (const source of ["TCGPLAYER", "EBAY"] as const) {
    const provider = priceProviders[source];
    if (!provider.isConfigured()) continue;
    try {
      providerSales[source] = await provider.getRecentSales(cardIdentifier, {
        condition: match.condition,
        gradingCompany: match.gradingCompany,
        grade: match.grade,
        language: match.language,
        // Providers filter by these options before applying this cap.
        limit: PROVIDER_QUALIFYING_LIMIT,
      });
    } catch (e) {
      errors.push(`${provider.displayName}: ${e instanceof Error ? e.message : "unavailable"}`);
    }
  }

  const tcg = [
    ...(providerSales.TCGPLAYER ?? []),
    ...dbSales.filter((s) => s.source === "TCGPLAYER"),
  ];
  const ebay = [
    ...(providerSales.EBAY ?? []),
    ...dbSales.filter((s) => s.source === "EBAY"),
  ];
  const merged = {
    ...(tcg.length > 0 ? { TCGPLAYER: tcg } : {}),
    ...(ebay.length > 0 ? { EBAY: ebay } : {}),
  };

  const { combined, bySource } = calculateCombinedValue(merged, 20, {
    match,
    currency: "USD",
  });

  return {
    combined,
    bySource,
    providerErrors: errors,
    usedStoredSalesOnly: Object.keys(providerSales).length === 0 && dbSales.length > 0,
  };
}
