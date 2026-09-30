import { getPrisma } from "@/lib/db/client";

import {
  DEFAULT_MOVER_LIMIT,
  periodStartDate,
  rankMovers,
  type DashboardMovers,
  type MoverPeriod,
  type MoverPoint,
} from "./movers-shared";

export type {
  DashboardMovers,
  MoverCard,
  MoverPeriod,
  MoverPoint,
  MoverWindow,
} from "./movers-shared";
export {
  DEFAULT_MOVER_LIMIT,
  isMoverPeriod,
  MOVER_PERIODS,
  periodStartDate,
  rankMovers,
} from "./movers-shared";

function keyFor(cardId: string, variantId: string | null): string {
  return `${cardId}::${variantId ?? "null"}`;
}

type SnapshotRow = {
  cardId: string;
  variantId: string | null;
  averagePrice: { toString(): string } | null;
  calculatedAt: Date;
  card: {
    name: string;
    set: { name: string; game: { slug: string; name: string } };
  };
};

function groupSnapshots(rows: SnapshotRow[]) {
  const map = new Map<
    string,
    {
      cardId: string;
      variantId: string | null;
      cardName: string;
      setName: string;
      gameSlug: string;
      gameName: string;
      points: MoverPoint[];
    }
  >();

  for (const row of rows) {
    const k = keyFor(row.cardId, row.variantId);
    let group = map.get(k);
    if (!group) {
      group = {
        cardId: row.cardId,
        variantId: row.variantId,
        cardName: row.card.name,
        setName: row.card.set.name,
        gameSlug: row.card.set.game.slug,
        gameName: row.card.set.game.name,
        points: [],
      };
      map.set(k, group);
    }
    group.points.push({
      at: row.calculatedAt.toISOString(),
      averagePrice:
        row.averagePrice === null ? null : Number(row.averagePrice.toString()),
    });
  }

  return [...map.values()];
}

async function loadPeriodSnapshots(since: Date): Promise<SnapshotRow[]> {
  return getPrisma().priceSnapshot.findMany({
    where: {
      source: "COMBINED",
      calculatedAt: { gte: since },
      averagePrice: { not: null },
    },
    select: {
      cardId: true,
      variantId: true,
      averagePrice: true,
      calculatedAt: true,
      card: {
        select: {
          name: true,
          set: { select: { name: true, game: { select: { slug: true, name: true } } } },
        },
      },
    },
    orderBy: { calculatedAt: "asc" },
  });
}

/**
 * Market movers: all catalogue cards with ≥2 COMBINED snapshots in the period.
 * Portfolio movers: same, restricted to the user's collection identities.
 */
export async function getDashboardMovers(params: {
  userId: string;
  period: MoverPeriod;
  limit?: number;
  now?: Date;
}): Promise<DashboardMovers> {
  const limit = params.limit ?? DEFAULT_MOVER_LIMIT;
  const since = periodStartDate(params.period, params.now);
  const snapshots = await loadPeriodSnapshots(since);
  const marketGroups = groupSnapshots(snapshots);
  const market = rankMovers(marketGroups, limit);

  const collection = await getPrisma().collectionItem.findMany({
    where: { userId: params.userId },
    select: { cardId: true, variantId: true },
  });
  const owned = new Set(collection.map((c) => keyFor(c.cardId, c.variantId)));
  const portfolioGroups = marketGroups.filter((g) => owned.has(keyFor(g.cardId, g.variantId)));
  const portfolio = rankMovers(portfolioGroups, limit);

  return {
    period: params.period,
    market,
    portfolio,
  };
}
