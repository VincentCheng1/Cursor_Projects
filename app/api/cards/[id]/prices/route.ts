import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { cardPricingQuerySchema } from "@/lib/cards/pricing-params";
import {
  isVariantSelectionRequired,
  resolvePricingIdentity,
} from "@/lib/cards/resolve-identity";
import { getCardById } from "@/lib/cards/service";
import { computeCardPrice } from "@/lib/pricing/services/compute-card-price";
import { getLatestPricesForCard } from "@/lib/pricing/services/latest-prices";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const query = cardPricingQuerySchema.parse({
      variantId: url.searchParams.get("variantId") ?? undefined,
      condition: url.searchParams.get("condition") ?? undefined,
      gradingCompany: url.searchParams.get("gradingCompany") ?? undefined,
      grade: url.searchParams.get("grade") ?? undefined,
    });

    const card = await getCardById(id);
    if (card === null) return jsonError("Card not found", 404);
    if (isVariantSelectionRequired(card, query.variantId)) {
      return jsonError("variantId is required when the card has multiple variants", 400);
    }

    const identity = await resolvePricingIdentity({
      cardId: id,
      ...query,
    });
    if (identity === null) return jsonError("Card not found", 404);

    const latest = await getLatestPricesForCard({
      cardId: id,
      variantId: identity.variant?.id,
      condition: identity.condition,
      gradingCompany: identity.gradingCompany,
      grade: identity.grade,
    });

    const live = await computeCardPrice(identity);

    return jsonOk({
      cardId: id,
      latest,
      live: {
        combined: live.combined,
        bySource: live.bySource,
        providerErrors: live.providerErrors,
      },
      calculatedAt: latest.COMBINED?.calculatedAt ?? null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
