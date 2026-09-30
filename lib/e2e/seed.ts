import bcrypt from "bcryptjs";

import { getPrisma } from "@/lib/db/client";
import { clearRefreshCooldowns } from "@/lib/pricing/rate-limit";
import { MAX_TRACKER_SERIES } from "@/lib/tracker/constants";

export const E2E_USER_EMAIL = "e2e@cardvault.test";
export const E2E_USER_PASSWORD = "TestPassword123!";

export interface E2ETrackerCard {
  cardId: string;
  variantId: string;
  cardNumber: string;
  cardName: string;
  setName: string;
  setCode: string;
  printYear: number | null;
}

export interface E2ESeedResult {
  email: string;
  password: string;
  userId: string;
  cardId: string;
  cardName: string;
  variantId: string | null;
  /** Catalogue identities for tracker max-8 / chart coverage. */
  trackerCards: E2ETrackerCard[];
  maxTrackerSeries: number;
}

/**
 * Creates a credentials user for Playwright (spec §40 step 1).
 * Catalogue cards come from `prisma db seed` plus e2e-only tracker fixtures.
 * Does not invent marketplace sales presented as real.
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
  await prisma.trackerSeries.deleteMany({ where: { userId: user.id } });
  // Retries reuse the same Next server process; drop in-memory refresh cool-downs.
  clearRefreshCooldowns();

  const card = await prisma.card.findFirst({
    where: { name: "Charizard" },
    include: { variants: true, set: true },
  });
  if (card === null) {
    throw new Error("E2E seed requires Charizard in catalogue (run prisma db seed).");
  }

  const variant = card.variants.find((v) => v.variantName === "Holo") ?? card.variants[0] ?? null;

  const trackerCards = await ensureTrackerCatalogueFixtures(card.gameId, card.setId, card.set.name, card.set.code);

  // COMBINED snapshots so /tracker chart + range chips have real points (not invented market prices —
  // these are test fixtures for persisted PriceSnapshot rows).
  const now = Date.now();
  for (const tc of trackerCards) {
    await prisma.priceSnapshot.deleteMany({
      where: {
        cardId: tc.cardId,
        variantId: tc.variantId,
        source: "COMBINED",
      },
    });
    const points = [
      { daysAgo: 2, price: 100 + Number(tc.cardNumber.replace(/\D/g, "") || 0) },
      { daysAgo: 10, price: 95 },
      { daysAgo: 40, price: 90 },
      { daysAgo: 100, price: 80 },
    ];
    for (const p of points) {
      await prisma.priceSnapshot.create({
        data: {
          cardId: tc.cardId,
          variantId: tc.variantId,
          source: "COMBINED",
          condition: "NEAR_MINT",
          gradingCompany: "RAW",
          grade: null,
          currency: "USD",
          averagePrice: p.price,
          salesUsed: 5,
          salesAvailable: 5,
          calculatedAt: new Date(now - p.daysAgo * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  return {
    email: E2E_USER_EMAIL,
    password: E2E_USER_PASSWORD,
    userId: user.id,
    cardId: card.id,
    cardName: card.name,
    variantId: variant?.id ?? null,
    trackerCards,
    maxTrackerSeries: MAX_TRACKER_SERIES,
  };
}

/** Enough distinct card+variant rows for max-8 tracker coverage. */
async function ensureTrackerCatalogueFixtures(
  gameId: string,
  setId: string,
  setName: string,
  setCode: string,
): Promise<E2ETrackerCard[]> {
  const prisma = getPrisma();
  const out: E2ETrackerCard[] = [];

  for (let i = 1; i <= MAX_TRACKER_SERIES + 1; i += 1) {
    const cardNumber = `E2E-${i}`;
    const cardName = `Tracker Fixture ${i}`;
    const card = await prisma.card.upsert({
      where: {
        setId_cardNumber_name: { setId, cardNumber, name: cardName },
      },
      update: {},
      create: {
        gameId,
        setId,
        name: cardName,
        cardNumber,
        rarity: "Common",
      },
    });

    // First fixture uses explicit printYear; others fall back to set.releaseDate.
    const printYear = i === 1 ? 1999 : null;
    const existing = await prisma.cardVariant.findFirst({
      where: {
        cardId: card.id,
        variantName: "Default",
        printing: null,
        language: "EN",
      },
    });
    const variant =
      existing !== null
        ? await prisma.cardVariant.update({
            where: { id: existing.id },
            data: { printYear, isFoil: false },
          })
        : await prisma.cardVariant.create({
            data: {
              cardId: card.id,
              variantName: "Default",
              printing: null,
              language: "EN",
              isFoil: false,
              printYear,
            },
          });

    out.push({
      cardId: card.id,
      variantId: variant.id,
      cardNumber,
      cardName,
      setName,
      setCode,
      printYear,
    });
  }

  return out;
}
