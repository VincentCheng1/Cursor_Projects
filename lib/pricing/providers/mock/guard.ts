/** Hard gate: mock marketplace data is only legal in automated tests (spec §41). */
export function assertMockProviderEnvironment(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "Mock pricing providers may only be loaded when NODE_ENV=test. Never use mock data in production.",
    );
  }
}
