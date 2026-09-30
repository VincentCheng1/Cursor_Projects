import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { listCollectionItems } from "@/lib/collection/service";
import { resolvePricingIdentity } from "@/lib/cards/resolve-identity";
import { assertCollectionRefreshAllowed } from "@/lib/pricing/rate-limit";
import { refreshCardPrice } from "@/lib/pricing/services/refresh-card-price";

export async function POST() {
  try {
    const { userId } = await requireUser();
    assertCollectionRefreshAllowed(userId);

    const items = await listCollectionItems(userId);
    const results: Array<{ collectionItemId: string; refreshed: boolean }> = [];

    for (const item of items) {
      const identity = await resolvePricingIdentity({
        cardId: item.cardId,
        variantId: item.variantId ?? undefined,
        condition: item.condition,
        gradingCompany: item.gradingCompany,
        grade: item.grade ?? undefined,
      });
      if (identity === null) {
        results.push({ collectionItemId: item.id, refreshed: false });
        continue;
      }
      const r = await refreshCardPrice(identity);
      results.push({ collectionItemId: item.id, refreshed: r.snapshotsWritten });
    }

    return jsonOk({ results });
  } catch (error) {
    return handleRouteError(error);
  }
}
