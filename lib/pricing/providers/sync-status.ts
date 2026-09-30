import { getPrisma } from "@/lib/db/client";

export async function getProviderLastSync(provider: string) {
  const row = await getPrisma().syncJob.findFirst({
    where: { provider, status: "SUCCEEDED" },
    orderBy: { completedAt: "desc" },
  });
  const lastError = await getPrisma().syncJob.findFirst({
    where: { provider, status: "FAILED" },
    orderBy: { completedAt: "desc" },
  });
  return {
    lastSuccessAt: row?.completedAt ?? null,
    lastErrorAt: lastError?.completedAt ?? null,
    lastErrorMessage: lastError?.errorMessage ?? null,
  };
}
