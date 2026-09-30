import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { getE2EPricingExpectations } from "@/lib/e2e/pricing-expectations";
import { z } from "zod";

const bodySchema = z.object({
  cardId: z.string().min(1),
  variantId: z.string().optional().nullable(),
});

/** Server-side oracle for mocked-provider pricing (spec §40). CARDVAULT_E2E=1 only. */
export async function POST(request: Request) {
  if (process.env.CARDVAULT_E2E !== "1") {
    return jsonError("Not found", 404);
  }

  try {
    const body = bodySchema.parse(await request.json());
    const expectations = await getE2EPricingExpectations(body.cardId, body.variantId);
    return jsonOk(expectations);
  } catch (error) {
    return handleRouteError(error);
  }
}
