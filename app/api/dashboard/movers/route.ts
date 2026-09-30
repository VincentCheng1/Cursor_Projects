import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { getDashboardMovers } from "@/lib/dashboard/movers";
import { moversQuerySchema } from "@/lib/dashboard/movers-schemas";

export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    const url = new URL(request.url);
    const query = moversQuerySchema.parse({
      period: url.searchParams.get("period") ?? undefined,
    });

    const movers = await getDashboardMovers({
      userId,
      period: query.period,
    });

    return jsonOk(movers);
  } catch (error) {
    return handleRouteError(error);
  }
}
