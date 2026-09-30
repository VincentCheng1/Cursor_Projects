export function tcgplayerIsConfigured(): boolean {
  const id = process.env.TCGPLAYER_CLIENT_ID;
  const secret = process.env.TCGPLAYER_CLIENT_SECRET;
  return id !== undefined && id !== "" && secret !== undefined && secret !== "";
}

export function tcgplayerApiBase(): string {
  return process.env.TCGPLAYER_API_BASE ?? "https://api.tcgplayer.com";
}

/**
 * Optional override for authorized sales-history access. When the default catalog
 * pricing routes do not expose completed sales for your credential tier, set this
 * to the endpoint TCGplayer documents for your partnership — CardVault will call
 * it and normalize real responses only (spec §12–§13).
 */
export function tcgplayerSalesHistoryUrl(productId: string): string | null {
  const template = process.env.TCGPLAYER_SALES_HISTORY_URL_TEMPLATE;
  if (template === undefined || template === "") return null;
  return template.replace("{productId}", encodeURIComponent(productId));
}
