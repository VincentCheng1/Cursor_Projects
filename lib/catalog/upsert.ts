import type { Prisma, SetType } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";

import type { CatalogProduct, CatalogSet, CatalogVariant } from "./types";

export type ExternalIds = {
  tcgplayer?: string;
  ebay?: string;
  [key: string]: string | undefined;
};

function asExternalIds(value: unknown): ExternalIds {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: ExternalIds = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v !== "") out[k] = v;
  }
  return out;
}

export async function resolveGameId(gameSlug: string): Promise<string | null> {
  const game = await getPrisma().game.findUnique({ where: { slug: gameSlug } });
  return game?.id ?? null;
}

/**
 * Upsert preference (§14b):
 * 1. Marketplace external product / set id
 * 2. (setId, cardNumber, name)
 * 3. Variant (cardId, variantName, printing, language)
 */
export async function upsertCatalogSet(input: {
  gameId: string;
  set: CatalogSet;
}): Promise<{ setId: string; created: boolean }> {
  const prisma = getPrisma();
  const code = input.set.code.trim() || input.set.externalSetId;
  const setType: SetType = input.set.setType ?? "MAIN";

  const byCode = await prisma.cardSet.findUnique({
    where: { gameId_code: { gameId: input.gameId, code } },
  });

  if (byCode !== null) {
    await prisma.cardSet.update({
      where: { id: byCode.id },
      data: {
        name: input.set.name,
        releaseDate: input.set.releaseDate ?? byCode.releaseDate,
        // Only overwrite setType when structured metadata supplied a value.
        ...(input.set.setType !== undefined ? { setType } : {}),
      },
    });
    return { setId: byCode.id, created: false };
  }

  const created = await prisma.cardSet.create({
    data: {
      gameId: input.gameId,
      name: input.set.name,
      code,
      releaseDate: input.set.releaseDate ?? null,
      setType,
    },
  });
  return { setId: created.id, created: true };
}

export async function findCardByExternalId(
  marketplace: "tcgplayer" | "ebay",
  externalId: string,
) {
  const rows = await getPrisma().$queryRaw<Array<{ id: string }>>`
    SELECT id FROM cards
    WHERE "externalIds" ->> ${marketplace} = ${externalId}
    LIMIT 1
  `;
  if (rows[0] === undefined) return null;
  return getPrisma().card.findUnique({ where: { id: rows[0].id } });
}

export async function upsertCatalogProduct(input: {
  gameId: string;
  setId: string;
  product: CatalogProduct;
  marketplace: "tcgplayer" | "ebay";
}): Promise<{ cardId: string; created: boolean }> {
  const prisma = getPrisma();
  const name = input.product.name.trim();
  const cardNumber = (input.product.cardNumber ?? "").trim() || "unknown";
  const externalId = input.product.externalProductId;

  const byExternal = await findCardByExternalId(input.marketplace, externalId);
  if (byExternal !== null) {
    const ids = asExternalIds(byExternal.externalIds);
    ids[input.marketplace] = externalId;
    await prisma.card.update({
      where: { id: byExternal.id },
      data: {
        name,
        cardNumber,
        rarity: input.product.rarity ?? byExternal.rarity,
        imageUrl: input.product.imageUrl ?? byExternal.imageUrl,
        externalIds: ids as Prisma.InputJsonValue,
        setId: input.setId,
        gameId: input.gameId,
      },
    });
    return { cardId: byExternal.id, created: false };
  }

  const byIdentity = await prisma.card.findUnique({
    where: {
      setId_cardNumber_name: { setId: input.setId, cardNumber, name },
    },
  });

  if (byIdentity !== null) {
    const ids = asExternalIds(byIdentity.externalIds);
    ids[input.marketplace] = externalId;
    await prisma.card.update({
      where: { id: byIdentity.id },
      data: {
        rarity: input.product.rarity ?? byIdentity.rarity,
        imageUrl: input.product.imageUrl ?? byIdentity.imageUrl,
        externalIds: ids as Prisma.InputJsonValue,
      },
    });
    return { cardId: byIdentity.id, created: false };
  }

  const created = await prisma.card.create({
    data: {
      gameId: input.gameId,
      setId: input.setId,
      name,
      cardNumber,
      rarity: input.product.rarity ?? null,
      imageUrl: input.product.imageUrl ?? null,
      externalIds: { [input.marketplace]: externalId } as Prisma.InputJsonValue,
    },
  });
  return { cardId: created.id, created: true };
}

export async function linkEbayExternalId(cardId: string, ebayId: string): Promise<void> {
  const prisma = getPrisma();
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (card === null) return;
  const ids = asExternalIds(card.externalIds);
  if (ids.ebay === ebayId) return;
  ids.ebay = ebayId;
  await prisma.card.update({
    where: { id: cardId },
    data: { externalIds: ids as Prisma.InputJsonValue },
  });
}

export async function upsertCatalogVariants(
  cardId: string,
  variants: CatalogVariant[],
): Promise<{ processed: number; failed: number }> {
  const prisma = getPrisma();
  let processed = 0;
  let failed = 0;

  async function upsertOne(variant: CatalogVariant) {
    const variantName = variant.variantName.trim() || "Default";
    const printing = variant.printing ?? null;
    const language = variant.language?.trim() || "EN";

    // Compound unique with nullable printing: prefer find-then-write over upsert.
    const existing = await prisma.cardVariant.findFirst({
      where: { cardId, variantName, printing, language },
    });
    if (existing !== null) {
      await prisma.cardVariant.update({
        where: { id: existing.id },
        data: {
          isFoil: variant.isFoil ?? false,
          isParallel: variant.isParallel ?? false,
        },
      });
      return;
    }
    await prisma.cardVariant.create({
      data: {
        cardId,
        variantName,
        printing,
        language,
        isFoil: variant.isFoil ?? false,
        isParallel: variant.isParallel ?? false,
      },
    });
  }

  for (const variant of variants) {
    try {
      await upsertOne(variant);
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  // Ensure every card has at least a Default EN variant for collection attach.
  if (variants.length === 0) {
    try {
      await upsertOne({ variantName: "Default", language: "EN", isFoil: false });
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed, failed };
}
