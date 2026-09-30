import type { Condition, GradingCompany, PriceSource } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";

export interface LatestPriceRow {
  source: PriceSource;
  averagePrice: number | null;
  medianPrice: number | null;
  minimumPrice: number | null;
  maximumPrice: number | null;
  salesUsed: number;
  salesAvailable: number;
  oldestSaleDate: Date | null;
  newestSaleDate: Date | null;
  calculatedAt: Date;
  status: "CALCULATED" | "INSUFFICIENT_DATA";
}

function decimalToNumber(value: { toString(): string } | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value.toString());
}

export async function getLatestPricesForCard(params: {
  cardId: string;
  variantId?: string | null;
  condition?: Condition;
  gradingCompany?: GradingCompany;
  grade?: string | null;
}): Promise<Partial<Record<PriceSource, LatestPriceRow>>> {
  const sources: PriceSource[] = ["COMBINED", "TCGPLAYER", "EBAY"];
  const out: Partial<Record<PriceSource, LatestPriceRow>> = {};

  for (const source of sources) {
    const row = await getPrisma().priceSnapshot.findFirst({
      where: {
        cardId: params.cardId,
        variantId: params.variantId ?? null,
        source,
        ...(params.condition ? { condition: params.condition } : {}),
        ...(params.gradingCompany ? { gradingCompany: params.gradingCompany } : {}),
        ...(params.grade !== undefined ? { grade: params.grade ?? null } : {}),
      },
      orderBy: { calculatedAt: "desc" },
    });
    if (row === null) continue;

    const average = decimalToNumber(row.averagePrice);
    out[source] = {
      source,
      averagePrice: average,
      medianPrice: decimalToNumber(row.medianPrice),
      minimumPrice: decimalToNumber(row.minimumPrice),
      maximumPrice: decimalToNumber(row.maximumPrice),
      salesUsed: row.salesUsed,
      salesAvailable: row.salesAvailable,
      oldestSaleDate: row.oldestSaleDate,
      newestSaleDate: row.newestSaleDate,
      calculatedAt: row.calculatedAt,
      status: average === null ? "INSUFFICIENT_DATA" : "CALCULATED",
    };
  }

  return out;
}
