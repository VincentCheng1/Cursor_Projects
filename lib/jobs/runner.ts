import type { SyncJobType } from "@/lib/db/generated/client";
import { resolvePricingIdentity } from "@/lib/cards/resolve-identity";

import { withRetries } from "./retry";
import {
  createSyncJob,
  finishSyncJob,
  markSyncJobRunning,
} from "./sync-job-repo";
import { calculateCardPriceJob } from "./handlers/calculate-card-price";
import { refreshCollectionJob } from "./handlers/refresh-collection";
import { snapshotPriceJob } from "./handlers/snapshot-price";
import { syncCardSales } from "./handlers/sync-card-sales";

export interface RunJobInput {
  type: SyncJobType;
  provider: string;
  cardId?: string;
  variantId?: string;
  userId?: string;
  condition?: import("@/lib/db/generated/client").Condition;
  gradingCompany?: import("@/lib/db/generated/client").GradingCompany;
  grade?: string;
}

export async function runBackgroundJob(input: RunJobInput) {
  const job = await createSyncJob(input.provider, input.type);

  try {
    const outcome = await withRetries(async (attempt) => {
      await markSyncJobRunning(job.id, attempt);

      switch (input.type) {
        case "SYNC_CARD_SALES": {
          if (input.cardId === undefined) throw new Error("cardId required");
          const identity = await resolvePricingIdentity({
            cardId: input.cardId,
            variantId: input.variantId,
            condition: input.condition,
            gradingCompany: input.gradingCompany,
            grade: input.grade,
          });
          if (identity === null) throw new Error("Card not found");
          return syncCardSales(identity);
        }
        case "CALCULATE_CARD_PRICE": {
          if (input.cardId === undefined) throw new Error("cardId required");
          const identity = await resolvePricingIdentity({
            cardId: input.cardId,
            variantId: input.variantId,
            condition: input.condition,
            gradingCompany: input.gradingCompany,
            grade: input.grade,
          });
          if (identity === null) throw new Error("Card not found");
          return calculateCardPriceJob(identity);
        }
        case "SNAPSHOT_PRICE": {
          if (input.cardId === undefined) throw new Error("cardId required");
          const identity = await resolvePricingIdentity({
            cardId: input.cardId,
            variantId: input.variantId,
            condition: input.condition,
            gradingCompany: input.gradingCompany,
            grade: input.grade,
          });
          if (identity === null) throw new Error("Card not found");
          return snapshotPriceJob(identity);
        }
        case "REFRESH_COLLECTION": {
          if (input.userId === undefined) throw new Error("userId required");
          return refreshCollectionJob(input.userId);
        }
        default:
          throw new Error(`Unknown job type: ${input.type}`);
      }
    });

    await finishSyncJob(
      job.id,
      "SUCCEEDED",
      outcome.processed,
      outcome.failed,
      outcome.errors?.length ? outcome.errors.join("; ") : undefined,
    );

    return { jobId: job.id, status: "SUCCEEDED" as const, outcome };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed";
    await finishSyncJob(job.id, "FAILED", 0, 1, message);
    return { jobId: job.id, status: "FAILED" as const, error: message };
  }
}
