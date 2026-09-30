import type { Prisma } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";

import type { createCollectionItemSchema, updateCollectionItemSchema } from "./schemas";
import type { z } from "zod";

const cardInclude = {
  card: {
    include: {
      set: { include: { game: true } },
      variants: true,
    },
  },
  variant: true,
} satisfies Prisma.CollectionItemInclude;

export async function listCollectionItems(userId: string) {
  return getPrisma().collectionItem.findMany({
    where: { userId },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getCollectionItem(userId: string, id: string) {
  return getPrisma().collectionItem.findFirst({
    where: { id, userId },
    include: cardInclude,
  });
}

export async function createCollectionItem(
  userId: string,
  data: z.infer<typeof createCollectionItemSchema>,
) {
  return getPrisma().collectionItem.create({
    data: {
      userId,
      cardId: data.cardId,
      variantId: data.variantId ?? null,
      condition: data.condition,
      gradingCompany: data.gradingCompany,
      grade: data.grade ?? null,
      quantity: data.quantity,
      purchasePrice: data.purchasePrice ?? null,
      purchaseDate: data.purchaseDate ?? null,
      purchaseSource: data.purchaseSource ?? null,
      notes: data.notes ?? null,
    },
    include: cardInclude,
  });
}

export async function updateCollectionItem(
  userId: string,
  id: string,
  data: z.infer<typeof updateCollectionItemSchema>,
) {
  const existing = await getCollectionItem(userId, id);
  if (existing === null) return null;

  return getPrisma().collectionItem.update({
    where: { id },
    data: {
      ...(data.variantId !== undefined ? { variantId: data.variantId ?? null } : {}),
      ...(data.condition !== undefined ? { condition: data.condition } : {}),
      ...(data.gradingCompany !== undefined ? { gradingCompany: data.gradingCompany } : {}),
      ...(data.grade !== undefined ? { grade: data.grade ?? null } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.purchasePrice !== undefined ? { purchasePrice: data.purchasePrice ?? null } : {}),
      ...(data.purchaseDate !== undefined ? { purchaseDate: data.purchaseDate ?? null } : {}),
      ...(data.purchaseSource !== undefined ? { purchaseSource: data.purchaseSource ?? null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
    },
    include: cardInclude,
  });
}

export async function deleteCollectionItem(userId: string, id: string) {
  const existing = await getCollectionItem(userId, id);
  if (existing === null) return false;
  await getPrisma().collectionItem.delete({ where: { id } });
  return true;
}
