/**
 * Mock providers are allowed only in automated test runtimes (spec §41).
 *
 * Vitest sets NODE_ENV=test. Playwright drives a real Next server with
 * CARDVAULT_E2E=1 (never in production).
 */
export function isMockProviderRuntime(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.CARDVAULT_E2E === "1";
}
