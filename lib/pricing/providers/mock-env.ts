/**
 * Mock providers are allowed only in automated test runtimes (spec §41).
 *
 * Vitest sets NODE_ENV=test. Playwright sets CARDVAULT_E2E=1 on the server
 * (including CI `next start`, where NODE_ENV=production). Real deployments
 * must never set CARDVAULT_E2E.
 */
export function isMockProviderRuntime(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return process.env.CARDVAULT_E2E === "1";
}
