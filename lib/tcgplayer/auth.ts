import { tcgplayerApiBase, tcgplayerIsConfigured } from "./config";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

export async function getTcgplayerAccessToken(): Promise<string> {
  if (!tcgplayerIsConfigured()) {
    throw new Error("TCGplayer integration not configured.");
  }

  const now = Date.now();
  if (cache !== null && cache.expiresAt > now + 30_000) {
    return cache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.TCGPLAYER_CLIENT_ID!,
    client_secret: process.env.TCGPLAYER_CLIENT_SECRET!,
  });

  const res = await fetch(`${tcgplayerApiBase()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`TCGplayer token request failed (${res.status})`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (json.access_token === undefined) {
    throw new Error("TCGplayer token response missing access_token");
  }

  const ttl = (json.expires_in ?? 3600) * 1000;
  cache = {
    accessToken: json.access_token,
    expiresAt: now + ttl,
  };

  return cache.accessToken;
}

export function clearTcgplayerTokenCache(): void {
  cache = null;
}
