import { z } from "zod";

export const createTrackerSeriesSchema = z.object({
  cardId: z.string().min(1),
  variantId: z.string().optional().nullable(),
});

export const updateTrackerSeriesSchema = z.object({
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(99).optional(),
});

export const trackerHistoryQuerySchema = z.object({
  ids: z.string().min(1),
  range: z.enum(["7D", "30D", "90D", "1Y", "ALL"]).default("30D"),
});
