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
