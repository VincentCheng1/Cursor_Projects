import { getPrisma } from "@/lib/db/client";

import { buildCardSearchWhere } from "./search";
import type { CardSearchInput } from "./schemas";

export async function searchCards(input: CardSearchInput) {
  const where = buildCardSearchWhere(input);
  const [items, total] = await Promise.all([
    getPrisma().card.findMany({
      where,
      include: {
        set: { include: { game: true } },
        variants: true,
      },
      take: input.limit,
      skip: input.offset,
      orderBy: { name: "asc" },
    }),
    getPrisma().card.count({ where }),
  ]);
  return { items, total };
}

export async function getCardById(id: string) {
  return getPrisma().card.findUnique({
    where: { id },
    include: {
      set: { include: { game: true } },
      variants: true,
    },
  });
}
