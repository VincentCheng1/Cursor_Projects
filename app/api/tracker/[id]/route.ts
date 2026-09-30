import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { updateTrackerSeriesSchema } from "@/lib/tracker/schemas";
import { serializeTrackerSeries } from "@/lib/tracker/serialize";
import { deleteTrackerSeries, updateTrackerSeries } from "@/lib/tracker/service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const body = updateTrackerSeriesSchema.parse(await request.json());
    const row = await updateTrackerSeries(userId, id, body);
    if (row === null) return jsonError("Not found", 404);
    return jsonOk(serializeTrackerSeries(row));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const ok = await deleteTrackerSeries(userId, id);
    if (!ok) return jsonError("Not found", 404);
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
