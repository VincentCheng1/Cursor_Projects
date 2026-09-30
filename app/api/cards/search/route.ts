import { handleRouteError, jsonOk } from "@/lib/api/http";
import { searchCards } from "@/lib/cards/service";
import { cardSearchSchema } from "@/lib/cards/schemas";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = cardSearchSchema.parse({
      q: url.searchParams.get("q") ?? "",
      game: url.searchParams.get("game") ?? undefined,
      set: url.searchParams.get("set") ?? undefined,
      cardNumber: url.searchParams.get("cardNumber") ?? undefined,
      rarity: url.searchParams.get("rarity") ?? undefined,
      variant: url.searchParams.get("variant") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    const result = await searchCards(parsed);
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
