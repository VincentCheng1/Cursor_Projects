import { z } from "zod";

const conditionEnum = z.enum([
  "DAMAGED",
  "HEAVILY_PLAYED",
  "MODERATELY_PLAYED",
  "LIGHTLY_PLAYED",
  "NEAR_MINT",
]);

const gradingEnum = z.enum(["RAW", "PSA", "CGC", "BGS", "SGC", "OTHER"]);

export const createCollectionItemSchema = z.object({
  cardId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  condition: conditionEnum,
  gradingCompany: gradingEnum.default("RAW"),
  grade: z.string().optional().nullable(),
  quantity: z.number().int().min(1).max(9999).default(1),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  purchaseDate: z.coerce.date().optional().nullable(),
  purchaseSource: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateCollectionItemSchema = createCollectionItemSchema
  .partial()
  .extend({
    quantity: z.number().int().min(1).max(9999).optional(),
  });

export const collectionSortSchema = z.enum([
  "name",
  "value",
  "purchasePrice",
  "profit",
  "roi",
  "recentlyAdded",
  "recentlyUpdated",
]);

export const collectionQuerySchema = z.object({
  q: z.string().optional(),
  sort: collectionSortSchema.default("recentlyAdded"),
  view: z.enum(["grid", "table"]).optional(),
});
