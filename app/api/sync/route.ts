import { z } from "zod";

import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { runBackgroundJob } from "@/lib/jobs/runner";
import { assertCollectionRefreshAllowed } from "@/lib/pricing/rate-limit";

const bodySchema = z.object({
  type: z.enum([
    "SYNC_CARD_SALES",
    "CALCULATE_CARD_PRICE",
    "SNAPSHOT_PRICE",
    "REFRESH_COLLECTION",
  ]),
  provider: z.string().default("cardvault"),
  cardId: z.string().optional(),
  variantId: z.string().optional(),
  condition: z
    .enum([
      "DAMAGED",
      "HEAVILY_PLAYED",
      "MODERATELY_PLAYED",
      "LIGHTLY_PLAYED",
      "NEAR_MINT",
    ])
    .optional(),
  gradingCompany: z.enum(["RAW", "PSA", "CGC", "BGS", "SGC", "OTHER"]).optional(),
  grade: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = bodySchema.parse(await request.json());

    if (body.type === "REFRESH_COLLECTION") {
      assertCollectionRefreshAllowed(userId);
    }

    const result = await runBackgroundJob({
      ...body,
      userId: body.type === "REFRESH_COLLECTION" ? userId : undefined,
    });

    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
