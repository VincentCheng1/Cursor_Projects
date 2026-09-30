import { isMockProviderRuntime } from "../mock-env";

/** Hard gate: mock marketplace data is only legal in automated tests (spec §41). */
export function assertMockProviderEnvironment(): void {
  if (!isMockProviderRuntime()) {
    throw new Error(
      "Mock pricing providers may only be loaded in test/e2e runtimes. Never use mock data in production.",
    );
  }
}
