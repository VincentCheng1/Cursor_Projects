import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { cardPricingQuerySchema } from "@/lib/cards/pricing-params";
import { resolvePricingIdentity } from "@/lib/cards/resolve-identity";
import { computeCardPrice } from "@/lib/pricing/services/compute-card-price";

type Params = { params: Promise<{ id: string }> };

/** Returns the exact sales used in the combined calculation (§29). */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const query = cardPricingQuerySchema.parse({
      variantId: url.searchParams.get("variantId") ?? undefined,
      condition: url.searchParams.get("condition") ?? undefined,
      gradingCompany: url.searchParams.get("gradingCompany") ?? undefined,
      grade: url.searchParams.get("grade") ?? undefined,
    });

    const identity = await resolvePricingIdentity({ cardId: id, ...query });
    if (identity === null) return jsonError("Card not found", 404);

    const { combined } = await computeCardPrice(identity);

    return jsonOk({
      status: combined.status,
      salesUsed: combined.salesUsed,
      salesAvailable: combined.salesAvailable,
      usedSales: combined.usedSales.map((u) => ({
        source: u.sale.source,
        saleDate: u.sale.saleDate,
        condition: u.sale.condition,
        gradingCompany: u.sale.gradingCompany,
        grade: u.sale.grade,
        salePrice: u.sale.salePrice,
        shippingPrice: u.sale.shippingPrice,
        totalPrice: u.sale.totalPrice,
        effectivePrice: u.effectivePrice,
        listingTitle: u.sale.listingTitle,
        listingUrl: u.sale.listingUrl,
      })),
      excludedCount: combined.excludedSales.length,
      oldestSaleDate: combined.oldestSaleDate,
      newestSaleDate: combined.newestSaleDate,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
