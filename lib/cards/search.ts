import type { Prisma } from "@/lib/db/generated/client";

import type { CardSearchInput } from "./schemas";

/** Builds a conservative Prisma filter for global card search (spec §25). */
export function buildCardSearchWhere(input: CardSearchInput): Prisma.CardWhereInput {
  const q = input.q.trim();
  const or: Prisma.CardWhereInput[] = [
    { name: { contains: q, mode: "insensitive" } },
    { cardNumber: { contains: q, mode: "insensitive" } },
    { set: { name: { contains: q, mode: "insensitive" } } },
    { set: { code: { contains: q, mode: "insensitive" } } },
  ];

  const where: Prisma.CardWhereInput = { OR: or };

  if (input.game !== undefined && input.game !== "") {
    where.game = { slug: input.game };
  }
  if (input.set !== undefined && input.set !== "") {
    where.set = { ...(where.set as object), name: { contains: input.set, mode: "insensitive" } };
  }
  if (input.cardNumber !== undefined && input.cardNumber !== "") {
    where.cardNumber = { contains: input.cardNumber, mode: "insensitive" };
  }
  if (input.rarity !== undefined && input.rarity !== "") {
    where.rarity = { contains: input.rarity, mode: "insensitive" };
  }
  if (input.variant !== undefined && input.variant !== "") {
    where.variants = {
      some: { variantName: { contains: input.variant, mode: "insensitive" } },
    };
  }

  return where;
}
