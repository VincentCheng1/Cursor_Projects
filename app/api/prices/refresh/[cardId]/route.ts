import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { cardPricingQuerySchema } from "@/lib/cards/pricing-params";
import { resolvePricingIdentity } from "@/lib/cards/resolve-identity";
import { assertSingleCardRefreshAllowed } from "@/lib/pricing/rate-limit";
import { refreshCardPrice } from "@/lib/pricing/services/refresh-card-price";
import { getLatestPricesForCard } from "@/lib/pricing/services/latest-prices";

type Params = { params: Promise<{ cardId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { userId } = await requireUser();
    const { cardId } = await params;
    assertSingleCardRefreshAllowed(userId, cardId);

    const url = new URL(request.url);
    const query = cardPricingQuerySchema.parse({
      variantId: url.searchParams.get("variantId") ?? undefined,
      condition: url.searchParams.get("condition") ?? undefined,
      gradingCompany: url.searchParams.get("gradingCompany") ?? undefined,
      grade: url.searchParams.get("grade") ?? undefined,
    });

    const identity = await resolvePricingIdentity({ cardId, ...query });
    if (identity === null) return jsonError("Card not found", 404);

    const result = await refreshCardPrice(identity);
    const latest = await getLatestPricesForCard({
      cardId,
      variantId: identity.variant?.id,
      condition: identity.condition,
      gradingCompany: identity.gradingCompany,
      grade: identity.grade,
    });

    if (!result.snapshotsWritten) {
      return jsonOk({
        refreshed: false,
        message:
          "Unable to refresh pricing. Showing last successful value.",
        live: result,
        latest,
      });
    }

    return jsonOk({
      refreshed: true,
      live: result,
      latest,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
