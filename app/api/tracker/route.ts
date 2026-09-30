import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { getLatestPricesForCard } from "@/lib/pricing/services/latest-prices";
import { MAX_TRACKER_SERIES } from "@/lib/tracker/constants";
import { createTrackerSeriesSchema } from "@/lib/tracker/schemas";
import { serializeTrackerSeries } from "@/lib/tracker/serialize";
import { createTrackerSeries, listTrackerSeries } from "@/lib/tracker/service";
import { TRACKER_SNAPSHOT_CONDITION, TRACKER_SNAPSHOT_GRADING } from "@/lib/tracker/history";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const rows = await listTrackerSeries(userId);
    const items = await Promise.all(
      rows.map(async (row) => {
        const base = serializeTrackerSeries(row);
        const latest = await getLatestPricesForCard({
          cardId: row.cardId,
          variantId: row.variantId,
          condition: TRACKER_SNAPSHOT_CONDITION,
          gradingCompany: TRACKER_SNAPSHOT_GRADING,
          grade: null,
        });
        return {
          ...base,
          latestValue: latest.COMBINED?.averagePrice ?? null,
          hasSnapshots: latest.COMBINED?.status === "CALCULATED",
        };
      }),
    );
    return jsonOk({ items, maxSeries: MAX_TRACKER_SERIES });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = createTrackerSeriesSchema.parse(await request.json());
    let row;
    try {
      row = await createTrackerSeries(userId, body);
    } catch (e) {
      if (e instanceof Error && e.message.includes("Tracker limit")) {
        return jsonError(e.message, 400);
      }
      throw e;
    }
    const base = serializeTrackerSeries(row);
    const latest = await getLatestPricesForCard({
      cardId: row.cardId,
      variantId: row.variantId,
      condition: TRACKER_SNAPSHOT_CONDITION,
      gradingCompany: TRACKER_SNAPSHOT_GRADING,
      grade: null,
    });
    return jsonOk(
      {
        ...base,
        latestValue: latest.COMBINED?.averagePrice ?? null,
        hasSnapshots: latest.COMBINED?.status === "CALCULATED",
      },
      201,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
