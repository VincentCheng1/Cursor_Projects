import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/require-admin";
import { runBackgroundJob } from "@/lib/jobs/runner";
import { assertPublicDataSyncAllowed } from "@/lib/pricing/rate-limit";

/**
 * Admin-only rate-limited “Run public data sync” (§45 / §14b).
 * Authorized marketplace APIs only — never HTML scraping.
 */
export async function POST() {
  try {
    const { userId } = await requireAdmin();
    assertPublicDataSyncAllowed(userId);

    const result = await runBackgroundJob({
      type: "SYNC_PUBLIC_DATA",
      provider: "cardvault",
    });

    return jsonOk({
      ...result,
      note: "Authorized public API ingest only. HTML scraping is not available.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
