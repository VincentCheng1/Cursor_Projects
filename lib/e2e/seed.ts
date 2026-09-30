import bcrypt from "bcryptjs";

import { getPrisma } from "@/lib/db/client";

export const E2E_USER_EMAIL = "e2e@cardvault.test";
export const E2E_USER_PASSWORD = "TestPassword123!";

export interface E2ESeedResult {
  email: string;
  password: string;
  userId: string;
  cardId: string;
  cardName: string;
  variantId: string | null;
}

/**
 * Creates a credentials user for Playwright (spec §40 step 1).
 * Catalogue cards come from `prisma db seed`; this does not invent cards.
 */
export async function seedE2EEnvironment(): Promise<E2ESeedResult> {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(E2E_USER_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: E2E_USER_EMAIL },
    update: { passwordHash },
    create: {
      email: E2E_USER_EMAIL,
      name: "E2E User",
      passwordHash,
    },
  });

  await prisma.collectionItem.deleteMany({ where: { userId: user.id } });

  const card = await prisma.card.findFirst({
    where: { name: "Charizard" },
    include: { variants: true },
  });
  if (card === null) {
    throw new Error("E2E seed requires Charizard in catalogue (run prisma db seed).");
  }

  const variant = card.variants.find((v) => v.variantName === "Holo") ?? card.variants[0] ?? null;

  return {
    email: E2E_USER_EMAIL,
    password: E2E_USER_PASSWORD,
    userId: user.id,
    cardId: card.id,
    cardName: card.name,
    variantId: variant?.id ?? null,
  };
}
