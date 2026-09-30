import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { buildDashboardMetrics, rowFromItem } from "@/lib/dashboard/aggregate";
import { listCollectionItems } from "@/lib/collection/service";
import { getLatestPricesForCard } from "@/lib/pricing/services/latest-prices";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const items = await listCollectionItems(userId);

    const rows = await Promise.all(
      items.map(async (item) => {
        const latest = await getLatestPricesForCard({
          cardId: item.cardId,
          variantId: item.variantId,
          condition: item.condition,
          gradingCompany: item.gradingCompany,
          grade: item.grade,
        });
        const value = latest.COMBINED?.averagePrice ?? null;
        return rowFromItem(item, value);
      }),
    );

    return jsonOk(buildDashboardMetrics(rows));
  } catch (error) {
    return handleRouteError(error);
  }
}
