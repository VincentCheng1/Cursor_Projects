import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { seedE2EEnvironment } from "@/lib/e2e/seed";

/**
 * Test-only catalogue + user seed for Playwright (spec §40).
 *
 * Enabled only when CARDVAULT_E2E=1 on the server. There is no public registration UI;
 * e2e creates a credentials user here instead.
 */
export async function POST() {
  if (process.env.CARDVAULT_E2E !== "1") {
    return jsonError("Not found", 404);
  }

  try {
    const result = await seedE2EEnvironment();
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
