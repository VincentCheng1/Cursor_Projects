export function ebayIsConfigured(): boolean {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  return id !== undefined && id !== "" && secret !== undefined && secret !== "";
}

export function ebayEnvironment(): "production" | "sandbox" {
  const env = process.env.EBAY_ENVIRONMENT ?? "production";
  return env === "sandbox" ? "sandbox" : "production";
}

export function ebayApiBase(): string {
  return ebayEnvironment() === "sandbox"
    ? "https://api.sandbox.ebay.com"
    : "https://api.ebay.com";
}

export function ebayFindingBase(): string {
  return ebayEnvironment() === "sandbox"
    ? "https://svcs.sandbox.ebay.com/services/search/FindingService/v1"
    : "https://svcs.ebay.com/services/search/FindingService/v1";
}
