import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { listProviderStatus } from "@/lib/pricing/providers/registry";
import { getProviderLastSync } from "@/lib/pricing/providers/sync-status";

export async function GET() {
  try {
    await requireUser();
    const providers = listProviderStatus();
    const enriched = await Promise.all(
      providers.map(async (p) => ({
        ...p,
        sync: await getProviderLastSync(p.id),
      })),
    );
    return jsonOk({ providers: enriched });
  } catch (error) {
    return handleRouteError(error);
  }
}
