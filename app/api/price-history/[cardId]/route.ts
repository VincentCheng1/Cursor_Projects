import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import {
  getPriceHistory,
  type HistoryRange,
} from "@/lib/pricing/services/price-history";
import { z } from "zod";

const querySchema = z.object({
  range: z.enum(["7D", "30D", "90D", "1Y", "ALL"]).default("30D"),
  variantId: z.string().optional(),
  source: z.enum(["COMBINED", "TCGPLAYER", "EBAY"]).optional(),
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
    });

    const rows = await getPriceHistory({
      cardId,
      variantId: query.variantId,
      source: query.source,
      range: query.range as HistoryRange,
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
