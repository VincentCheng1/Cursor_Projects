import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { getTrackerHistory } from "@/lib/tracker/history";
import { trackerHistoryQuerySchema } from "@/lib/tracker/schemas";
import { listTrackerSeries } from "@/lib/tracker/service";
import type { HistoryRange } from "@/lib/pricing/services/price-history";

export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    const url = new URL(request.url);
    const query = trackerHistoryQuerySchema.parse({
      ids: url.searchParams.get("ids") ?? "",
      range: url.searchParams.get("range") ?? undefined,
    });

    const requestedIds = query.ids.split(",").map((s) => s.trim()).filter(Boolean);
    if (requestedIds.length === 0) {
      return jsonOk({ range: query.range, series: [] });
    }

    const owned = await listTrackerSeries(userId);
    const allowed = owned.filter((s) => requestedIds.includes(s.id));
    if (allowed.length !== requestedIds.length) {
      return jsonError("One or more series ids are invalid", 400);
    }

    const series = await getTrackerHistory(
      allowed.map((s) => ({ id: s.id, cardId: s.cardId, variantId: s.variantId })),
      query.range as HistoryRange,
    );

    return jsonOk({ range: query.range, series });
  } catch (error) {
    return handleRouteError(error);
  }
}
