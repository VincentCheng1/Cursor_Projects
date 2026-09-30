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

  // Never silently pick among multiple variants — wrong variant poisons the average.
  // Single-variant cards may default; multi-variant requires an explicit variantId.
  let variant = null;
  if (params.variantId !== undefined) {
    variant = card.variants.find((v) => v.id === params.variantId) ?? null;
    if (variant === null) return null;
  } else if (card.variants.length === 1) {
    variant = card.variants[0] ?? null;
  } else if (card.variants.length === 0) {
    variant = null;
  } else {
    // Ambiguous: leave variant unset; callers must require selection before pricing.
    variant = null;
  }

  return {
    card,
    variant,
    condition: params.condition ?? "NEAR_MINT",
    gradingCompany: params.gradingCompany ?? "RAW",
    grade: params.grade ?? null,
  };
}

/** True when the card has multiple variants and none was explicitly chosen. */
export function isVariantSelectionRequired(
  card: { variants: { id: string }[] },
  variantId?: string | null,
): boolean {
  return card.variants.length > 1 && (variantId === undefined || variantId === null || variantId === "");
}
