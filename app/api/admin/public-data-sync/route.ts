import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSyncReadiness } from "@/lib/catalog/sync-readiness";
import { runBackgroundJob } from "@/lib/jobs/runner";
import { assertPublicDataSyncAllowed } from "@/lib/pricing/rate-limit";

/**
 * Admin-only rate-limited “Run public data sync” (§45 / §14b).
 * Authorized marketplace APIs only — never HTML scraping.
 *
 * Pass `?dryRun=1` (or JSON `{ "dryRun": true }`) for a sync-readiness check that
 * does not call marketplace APIs and does not write catalog rows (§5).
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireAdmin();

    const url = new URL(request.url);
    let dryRun = url.searchParams.get("dryRun") === "1";
    if (!dryRun) {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          const body = (await request.json()) as { dryRun?: boolean };
          dryRun = body.dryRun === true;
        } catch {
          // Empty body is fine for a real sync POST.
        }
      }
    }

    if (dryRun) {
      const readiness = getSyncReadiness();
      return jsonOk({
        dryRun: true as const,
        status: "READINESS_ONLY",
        readiness,
        note: "Dry-run only — no marketplace API calls and no catalog writes. Set credentials then run without dryRun to ingest authorized public data.",
      });
    }

    const readiness = getSyncReadiness();
    if (!readiness.canRunPublicDataSync) {
      return jsonOk({
        dryRun: false as const,
        status: "BLOCKED_NOT_CONFIGURED",
        readiness,
        note: "No marketplace credentials configured. Public data sync did not run. HTML scraping is not available.",
      });
    }

    assertPublicDataSyncAllowed(userId);

    const result = await runBackgroundJob({
      type: "SYNC_PUBLIC_DATA",
      provider: "cardvault",
    });

    return jsonOk({
      ...result,
      dryRun: false as const,
      readiness,
      note: "Authorized public API ingest only. HTML scraping is not available.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
