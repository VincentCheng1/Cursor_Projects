import type { Card, CardVariant } from "@/lib/db/generated/client";
import type { Condition, GradingCompany } from "@/lib/db/generated/client";

import type { SaleMatchCriteria } from "../types/card";

export interface PricingIdentity {
  card: Card & { set: { name: string; code: string; game: { name: string; slug: string } } };
  variant?: CardVariant | null;
  condition: Condition;
  gradingCompany: GradingCompany;
  grade?: string | null;
}

export function buildMatchCriteria(identity: PricingIdentity): SaleMatchCriteria {
  const { card, variant, condition, gradingCompany, grade } = identity;
  return {
    cardId: card.id,
    variantId: variant?.id,
    game: card.set.game.slug,
    cardName: card.name,
    setName: card.set.name,
    setCode: card.set.code,
    cardNumber: card.cardNumber,
    variantName: variant?.variantName,
    printing: variant?.printing ?? undefined,
    language: variant?.language ?? "EN",
    condition,
    gradingCompany,
    grade: grade ?? undefined,
  };
}
