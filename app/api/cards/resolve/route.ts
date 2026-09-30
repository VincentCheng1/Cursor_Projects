import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { cardResolveQuerySchema } from "@/lib/cards/resolve-identity-filters";
import { resolveCatalogCards } from "@/lib/cards/resolve-catalog";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const query = cardResolveQuerySchema.parse({
      cardNumber: url.searchParams.get("cardNumber") ?? "",
      set: url.searchParams.get("set") ?? undefined,
      setType: url.searchParams.get("setType") ?? undefined,
      isFoil: url.searchParams.get("isFoil") ?? undefined,
      year: url.searchParams.get("year") ?? undefined,
      game: url.searchParams.get("game") ?? undefined,
    });

    const matches = await resolveCatalogCards(query);
    return jsonOk({ matches, count: matches.length });
  } catch (error) {
    return handleRouteError(error);
  }
}
