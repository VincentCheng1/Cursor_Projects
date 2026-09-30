import { z } from "zod";

export const cardSearchSchema = z.object({
  q: z.string().trim().min(1).max(200),
  game: z.string().optional(),
  set: z.string().optional(),
  cardNumber: z.string().optional(),
  rarity: z.string().optional(),
  variant: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CardSearchInput = z.infer<typeof cardSearchSchema>;
