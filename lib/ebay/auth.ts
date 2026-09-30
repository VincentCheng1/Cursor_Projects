import { ebayApiBase, ebayIsConfigured } from "./config";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

export async function getEbayAccessToken(): Promise<string> {
  if (!ebayIsConfigured()) {
    throw new Error("eBay integration not configured.");
  }

  const now = Date.now();
  if (cache !== null && cache.expiresAt > now + 30_000) {
    return cache.accessToken;
  }

  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID!}:${process.env.EBAY_CLIENT_SECRET!}`,
  ).toString("base64");

  const res = await fetch(`${ebayApiBase()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!res.ok) {
    throw new Error(`eBay token request failed (${res.status})`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (json.access_token === undefined) {
    throw new Error("eBay token response missing access_token");
  }

  cache = {
    accessToken: json.access_token,
    expiresAt: now + (json.expires_in ?? 7200) * 1000,
  };
  return cache.accessToken;
}

export function clearEbayTokenCache(): void {
  cache = null;
}
