import type { Prisma, SetType } from "@/lib/db/generated/client";
import { z } from "zod";

export const cardResolveQuerySchema = z.object({
  cardNumber: z.string().min(1),
  set: z.string().optional(),
  setType: z.enum(["MAIN", "PROMO", "OTHER"]).optional(),
  isFoil: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  game: z.string().optional(),
});

export type CardResolveQuery = z.infer<typeof cardResolveQuerySchema>;

/** Builds a conservative catalogue filter for tracker add / resolve (spec §30b). */
export function buildCardResolveWhere(input: CardResolveQuery): Prisma.CardWhereInput {
  const where: Prisma.CardWhereInput = {
    cardNumber: { equals: input.cardNumber, mode: "insensitive" },
  };

  if (input.game) {
    where.game = { slug: input.game };
  }

  const setFilter: Prisma.CardSetWhereInput = {};
  if (input.set) {
    setFilter.OR = [
      { name: { equals: input.set, mode: "insensitive" } },
      { code: { equals: input.set, mode: "insensitive" } },
    ];
  }
  if (input.setType) {
    setFilter.setType = input.setType as SetType;
  }
  if (input.year !== undefined) {
    const start = new Date(Date.UTC(input.year, 0, 1));
    const end = new Date(Date.UTC(input.year + 1, 0, 1));
    setFilter.releaseDate = { gte: start, lt: end };
  }
  if (Object.keys(setFilter).length > 0) {
    where.set = setFilter;
  }

  if (input.isFoil !== undefined) {
    where.variants = { some: { isFoil: input.isFoil } };
  }

  return where;
}
