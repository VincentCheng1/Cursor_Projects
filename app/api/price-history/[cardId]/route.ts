import { handleRouteError, jsonOk } from "@/lib/api/http";
import {
  getPriceHistory,
  type HistoryRange,
} from "@/lib/pricing/services/price-history";
import { z } from "zod";

const querySchema = z.object({
  range: z.enum(["7D", "30D", "90D", "1Y", "ALL"]).default("30D"),
  variantId: z.string().optional(),
  source: z.enum(["COMBINED", "TCGPLAYER", "EBAY"]).optional(),
  condition: z
    .enum([
      "DAMAGED",
      "HEAVILY_PLAYED",
      "MODERATELY_PLAYED",
      "LIGHTLY_PLAYED",
      "NEAR_MINT",
    ])
    .optional(),
  gradingCompany: z.enum(["RAW", "PSA", "CGC", "BGS", "SGC", "OTHER"]).optional(),
  grade: z.string().optional(),
});

type Params = { params: Promise<{ cardId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { cardId } = await params;
    const url = new URL(request.url);
    const query = querySchema.parse({
      range: url.searchParams.get("range") ?? undefined,
      variantId: url.searchParams.get("variantId") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      condition: url.searchParams.get("condition") ?? undefined,
      gradingCompany: url.searchParams.get("gradingCompany") ?? undefined,
      grade: url.searchParams.get("grade") ?? undefined,
    });

    const rows = await getPriceHistory({
      cardId,
      variantId: query.variantId,
      source: query.source,
      range: query.range as HistoryRange,
      condition: query.condition,
      gradingCompany: query.gradingCompany,
      grade: query.grade ?? null,
    });

    return jsonOk({
      cardId,
      range: query.range,
      points: rows.map((r) => ({
        calculatedAt: r.calculatedAt,
        averagePrice: r.averagePrice ? Number(r.averagePrice.toString()) : null,
        salesUsed: r.salesUsed,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
