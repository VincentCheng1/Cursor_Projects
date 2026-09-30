import { z } from "zod";

export const cardPricingQuerySchema = z.object({
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
