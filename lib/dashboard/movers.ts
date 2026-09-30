import { getPrisma } from "@/lib/db/client";
import { rangeChangePercent } from "@/lib/tracker/chart-data";

export type MoverPeriod = "daily" | "weekly" | "monthly";

export const MOVER_PERIODS: readonly MoverPeriod[] = ["daily", "weekly", "monthly"] as const;

const PERIOD_DAYS: Record<MoverPeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

export const DEFAULT_MOVER_LIMIT = 5;

export interface MoverPoint {
  at: string;
  averagePrice: number | null;
}

export interface MoverCard {
  cardId: string;
  variantId: string | null;
  cardName: string;
  setName: string;
  gameSlug: string;
  gameName: string;
  startPrice: number;
  endPrice: number;
  absoluteChange: number;
  percentChange: number;
}

export interface MoverWindow {
  gainers: MoverCard[];
  decliners: MoverCard[];
}

export interface DashboardMovers {
  period: MoverPeriod;
  market: MoverWindow;
  portfolio: MoverWindow;
}

export function periodStartDate(period: MoverPeriod, now = new Date()): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - PERIOD_DAYS[period]);
  return d;
}

export function isMoverPeriod(value: string): value is MoverPeriod {
  return (MOVER_PERIODS as readonly string[]).includes(value);
}

function keyFor(cardId: string, variantId: string | null): string {
  return `${cardId}::${variantId ?? "null"}`;
}

/** Rank cards by period % change from ordered snapshot points (first → last). */
export function rankMovers(
  groups: Array<{
    cardId: string;
    variantId: string | null;
    cardName: string;
    setName: string;
    gameSlug: string;
    gameName: string;
    points: MoverPoint[];
  }>,
  limit = DEFAULT_MOVER_LIMIT,
): MoverWindow {
  const scored: MoverCard[] = [];

  for (const g of groups) {
    const values = g.points
      .map((p) => p.averagePrice)
      .filter((v): v is number => v !== null);
    if (values.length < 2) continue;

    const percentChange = rangeChangePercent(g.points);
    if (percentChange === null) continue;

    const startPrice = values[0]!;
    const endPrice = values[values.length - 1]!;
    scored.push({
      cardId: g.cardId,
      variantId: g.variantId,
      cardName: g.cardName,
      setName: g.setName,
      gameSlug: g.gameSlug,
      gameName: g.gameName,
      startPrice,
      endPrice,
      absoluteChange: endPrice - startPrice,
      percentChange,
    });
  }

  const gainers = [...scored]
    .filter((c) => c.percentChange > 0)
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, limit);

  const decliners = [...scored]
    .filter((c) => c.percentChange < 0)
    .sort((a, b) => a.percentChange - b.percentChange)
    .slice(0, limit);

  return { gainers, decliners };
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
