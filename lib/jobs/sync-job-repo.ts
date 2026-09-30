import type { SyncJobStatus, SyncJobType } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";

export async function createSyncJob(provider: string, type: SyncJobType) {
  return getPrisma().syncJob.create({
    data: {
      provider,
      type,
      status: "PENDING",
    },
  });
}

export async function markSyncJobRunning(id: string, attempt: number) {
  return getPrisma().syncJob.update({
    where: { id },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      attempt,
    },
  });
}

export async function finishSyncJob(
  id: string,
  status: SyncJobStatus,
  recordsProcessed: number,
  recordsFailed: number,
  errorMessage?: string,
) {
  return getPrisma().syncJob.update({
    where: { id },
    data: {
      status,
      completedAt: new Date(),
      recordsProcessed,
      recordsFailed,
      errorMessage: errorMessage ?? null,
    },
  });
}
