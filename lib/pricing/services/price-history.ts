import type { PriceSource } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";

export type HistoryRange = "7D" | "30D" | "90D" | "1Y" | "ALL";

export function rangeStartDate(range: HistoryRange, now = new Date()): Date | null {
  if (range === "ALL") return null;
  const d = new Date(now);
  switch (range) {
    case "7D":
      d.setUTCDate(d.getUTCDate() - 7);
      return d;
    case "30D":
      d.setUTCDate(d.getUTCDate() - 30);
      return d;
    case "90D":
      d.setUTCDate(d.getUTCDate() - 90);
      return d;
    case "1Y":
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      return d;
    default:
      return null;
  }
}

export async function getPriceHistory(params: {
  cardId: string;
  variantId?: string | null;
  source?: PriceSource;
  range: HistoryRange;
}) {
  const source = params.source ?? "COMBINED";
  const since = rangeStartDate(params.range);

  return getPrisma().priceSnapshot.findMany({
    where: {
      cardId: params.cardId,
      variantId: params.variantId ?? null,
      source,
      ...(since ? { calculatedAt: { gte: since } } : {}),
    },
    orderBy: { calculatedAt: "asc" },
  });
}
