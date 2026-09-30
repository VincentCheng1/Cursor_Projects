import { getPrisma } from "@/lib/db/client";

import {
  buildCardResolveWhere,
  type CardResolveQuery,
} from "./resolve-identity-filters";

export interface ResolvedCatalogEntry {
  cardId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  setCode: string;
  setType: string;
  releaseYear: number | null;
  variantId: string | null;
  variantName: string | null;
  isFoil: boolean;
  label: string;
}

function releaseYear(date: Date | null | undefined): number | null {
  if (!date) return null;
  return date.getUTCFullYear();
}

function formatLabel(params: {
  cardName: string;
  setName: string;
  cardNumber: string;
  isFoil: boolean;
  year: number | null;
  setType: string;
}): string {
  const foil = params.isFoil ? "Foil" : "Non-Foil";
  const year = params.year !== null ? String(params.year) : "—";
  const type =
    params.setType === "MAIN" ? "Main" : params.setType === "PROMO" ? "Promo" : "Other";
  return `${params.cardName} · ${params.setName} · ${params.cardNumber} · ${foil} · ${year} · ${type}`;
}

/**
 * Resolves catalogue rows for tracker add. Never invents cards (spec §5).
 * Returns one row per matching card+variant (foil filter may narrow variants).
 */
export async function resolveCatalogCards(
  query: CardResolveQuery,
): Promise<ResolvedCatalogEntry[]> {
  const prisma = getPrisma();
  const where = buildCardResolveWhere(query);

  const cards = await prisma.card.findMany({
    where,
    include: {
      set: true,
      variants: true,
    },
    take: 50,
  });

  const entries: ResolvedCatalogEntry[] = [];
  for (const card of cards) {
    const variants =
      query.isFoil === undefined
        ? card.variants
        : card.variants.filter((v) => v.isFoil === query.isFoil);

    const variantRows = variants.length > 0 ? variants : [null];
    for (const variant of variantRows) {
      const year = releaseYear(card.set.releaseDate);
      const isFoil = variant?.isFoil ?? false;
      entries.push({
        cardId: card.id,
        cardName: card.name,
        cardNumber: card.cardNumber,
        setName: card.set.name,
        setCode: card.set.code,
        setType: card.set.setType,
        releaseYear: year,
        variantId: variant?.id ?? null,
        variantName: variant?.variantName ?? null,
        isFoil,
        label: formatLabel({
          cardName: card.name,
          setName: card.set.name,
          cardNumber: card.cardNumber,
          isFoil,
          year,
          setType: card.set.setType,
        }),
      });
    }
  }

  return entries;
}
