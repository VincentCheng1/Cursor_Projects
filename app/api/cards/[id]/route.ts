import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { getCardById } from "@/lib/cards/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const card = await getCardById(id);
    if (card === null) return jsonError("Card not found", 404);
    return jsonOk(card);
  } catch (error) {
    return handleRouteError(error);
  }
}
