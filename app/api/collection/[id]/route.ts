import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { requireOwnership } from "@/lib/auth/ownership";
import { requireUser } from "@/lib/auth/require-user";
import { enrichCollectionItem } from "@/lib/collection/enrich";
import { updateCollectionItemSchema } from "@/lib/collection/schemas";
import {
  deleteCollectionItem,
  getCollectionItem,
  updateCollectionItem,
} from "@/lib/collection/service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const existing = await getCollectionItem(userId, id);
    if (existing === null) return jsonError("Not found", 404);
    requireOwnership(existing.userId, userId);

    const body = updateCollectionItemSchema.parse(await request.json());
    const item = await updateCollectionItem(userId, id, body);
    if (item === null) return jsonError("Not found", 404);
    const enriched = await enrichCollectionItem(item);
    return jsonOk(enriched);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const existing = await getCollectionItem(userId, id);
    if (existing === null) return jsonError("Not found", 404);
    requireOwnership(existing.userId, userId);
    const ok = await deleteCollectionItem(userId, id);
    if (!ok) return jsonError("Not found", 404);
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
