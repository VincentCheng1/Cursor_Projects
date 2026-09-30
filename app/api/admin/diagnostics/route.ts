import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listPublicDataSurfaceStatus } from "@/lib/catalog/status";
import { getSyncReadiness } from "@/lib/catalog/sync-readiness";
import { getPrisma } from "@/lib/db/client";
import { listProviderStatus } from "@/lib/pricing/providers/registry";
import { getProviderLastSync } from "@/lib/pricing/providers/sync-status";

/** Admin diagnostics (§45) — never exposes API secrets. */
export async function GET() {
  try {
    await requireAdmin();

    const syncReadiness = getSyncReadiness();
    const providers = listProviderStatus();
    const providerDetails = await Promise.all(
      providers.map(async (p) => {
        const readiness = syncReadiness.providers.find((r) => r.id === p.id);
        const healthMessage =
          p.health.status === "READY" ? undefined : p.health.message;
        return {
          ...p,
          /** Env-based readiness (authoritative for live APIs; ignores mock test runtime). */
          credentialsConfigured: readiness?.configured ?? false,
          missingEnvVars: readiness?.missingEnvVars ?? [],
          statusMessage: readiness?.statusMessage ?? healthMessage,
          sync: await getProviderLastSync(p.id),
        };
      }),
    );

    let databaseStatus = "unknown";
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      databaseStatus = "ok";
    } catch {
      databaseStatus = "error";
    }

    const [recentJobs, publicDataSurfaces, catalogCounts] = await Promise.all([
      getPrisma().syncJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          provider: true,
          type: true,
          status: true,
          startedAt: true,
          completedAt: true,
          recordsProcessed: true,
          recordsFailed: true,
          errorMessage: true,
        },
      }),
      listPublicDataSurfaceStatus(),
      Promise.all([
        getPrisma().game.count(),
        getPrisma().cardSet.count(),
        getPrisma().card.count(),
        getPrisma().cardVariant.count(),
        getPrisma().sale.count(),
      ]),
    ]);

    const [games, sets, cards, variants, sales] = catalogCounts;

    return jsonOk({
      tcgplayer: providerDetails.find((p) => p.id === "TCGPLAYER"),
      ebay: providerDetails.find((p) => p.id === "EBAY"),
      syncReadiness,
      publicDataSurfaces,
      catalogCounts: { games, sets, cards, variants, sales },
      database: { status: databaseStatus },
      backgroundJobs: recentJobs,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
