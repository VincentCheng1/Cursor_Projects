import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { enrichCollectionItem } from "@/lib/collection/enrich";
import { createCollectionItemSchema } from "@/lib/collection/schemas";
import {
  createCollectionItem,
  listCollectionItems,
} from "@/lib/collection/service";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const items = await listCollectionItems(userId);
    const enriched = await Promise.all(items.map(enrichCollectionItem));
    return jsonOk({ items: enriched });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = createCollectionItemSchema.parse(await request.json());
    const item = await createCollectionItem(userId, body);
    const enriched = await enrichCollectionItem(item);
    return jsonOk(enriched, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
