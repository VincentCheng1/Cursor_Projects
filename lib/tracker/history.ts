import type { Condition, GradingCompany } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";
import {
  rangeStartDate,
  type HistoryRange,
} from "@/lib/pricing/services/price-history";

/** Default snapshot scope for tracker lines (raw near-mint combined). */
export const TRACKER_SNAPSHOT_CONDITION: Condition = "NEAR_MINT";
export const TRACKER_SNAPSHOT_GRADING: GradingCompany = "RAW";

export interface TrackerHistoryPoint {
  at: string;
  averagePrice: number | null;
}

export interface TrackerHistorySeries {
  seriesId: string;
  cardId: string;
  variantId: string | null;
  points: TrackerHistoryPoint[];
}

export async function getTrackerHistory(
  series: Array<{ id: string; cardId: string; variantId: string | null }>,
  range: HistoryRange,
): Promise<TrackerHistorySeries[]> {
  const since = rangeStartDate(range);
  const prisma = getPrisma();
  const out: TrackerHistorySeries[] = [];

  for (const s of series) {
    const rows = await prisma.priceSnapshot.findMany({
      where: {
        cardId: s.cardId,
        variantId: s.variantId,
        source: "COMBINED",
        condition: TRACKER_SNAPSHOT_CONDITION,
        gradingCompany: TRACKER_SNAPSHOT_GRADING,
        grade: null,
        ...(since ? { calculatedAt: { gte: since } } : {}),
      },
      orderBy: { calculatedAt: "asc" },
    });

    out.push({
      seriesId: s.id,
      cardId: s.cardId,
      variantId: s.variantId,
      points: rows.map((r) => ({
        at: r.calculatedAt.toISOString(),
        averagePrice:
          r.averagePrice === null ? null : Number(r.averagePrice.toString()),
      })),
    });
  }

  return out;
}
