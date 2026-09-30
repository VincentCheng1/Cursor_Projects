import type { PricingIdentity } from "@/lib/pricing/services/match-criteria";
import type { CardIdentifier } from "@/lib/pricing/types/card";

export function cardIdentifierFromIdentity(identity: PricingIdentity): CardIdentifier {
  const ids = identity.card.externalIds as { tcgplayer?: string; ebay?: string } | null;
  return {
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
    externalIds: ids ?? undefined,
  };
}
