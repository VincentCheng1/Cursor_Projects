import { resolvePricingIdentity } from "@/lib/cards/resolve-identity";
import { computeCardPrice } from "@/lib/pricing/services/compute-card-price";

export interface E2EPricingExpectations {
  average: number | null;
  salesUsed: number;
  usedSales: Array<{
    source: string;
    externalSaleId?: string;
    effectivePrice: number;
    saleDate: string;
  }>;
}

export async function getE2EPricingExpectations(
  cardId: string,
  variantId?: string | null,
): Promise<E2EPricingExpectations> {
  const identity = await resolvePricingIdentity({
    cardId,
    variantId: variantId ?? undefined,
    condition: "NEAR_MINT",
    gradingCompany: "RAW",
  });
  if (identity === null) {
    throw new Error("Could not resolve pricing identity for e2e expectations");
  }

  const live = await computeCardPrice(identity);
  const average = live.combined.average;
  const usedSales = live.combined.usedSales.map((u) => ({
    source: u.sale.source,
    externalSaleId: u.sale.externalSaleId,
    effectivePrice: u.effectivePrice,
    saleDate: u.sale.saleDate.toISOString(),
  }));

  return {
    average,
    salesUsed: live.combined.salesUsed,
    usedSales,
  };
}
