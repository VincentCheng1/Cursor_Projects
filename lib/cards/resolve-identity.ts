import type { Condition, GradingCompany } from "@/lib/db/generated/client";

import { getCardById } from "./service";
import type { PricingIdentity } from "@/lib/pricing/services/match-criteria";

export async function resolvePricingIdentity(params: {
  cardId: string;
  variantId?: string;
  condition?: Condition;
  gradingCompany?: GradingCompany;
  grade?: string;
}): Promise<PricingIdentity | null> {
  const card = await getCardById(params.cardId);
  if (card === null) return null;

  const variant =
    params.variantId !== undefined
      ? card.variants.find((v) => v.id === params.variantId) ?? null
      : card.variants[0] ?? null;

  return {
    card,
    variant,
    condition: params.condition ?? "NEAR_MINT",
    gradingCompany: params.gradingCompany ?? "RAW",
    grade: params.grade ?? null,
  };
}
