import { logProviderRequest } from "@/lib/logging/provider-logger";
import { waitForProviderSlot } from "@/lib/pricing/providers/rate-limit";

import { getTcgplayerAccessToken } from "./auth";
import { tcgplayerApiBase } from "./config";

export async function tcgplayerRequest<T>(
  operation: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  await waitForProviderSlot("TCGPLAYER");
  const started = Date.now();
  const token = await getTcgplayerAccessToken();
  const url = path.startsWith("http") ? path : `${tcgplayerApiBase()}${path}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      logProviderRequest({
        provider: "TCGPLAYER",
        operation,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - started,
        success: false,
        errorCode: String(res.status),
        recordsReturned: 0,
      });
      throw new Error(`TCGplayer ${operation} failed (${res.status})`);
    }

    const data = (await res.json()) as T;
    logProviderRequest({
      provider: "TCGPLAYER",
      operation,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      success: true,
      recordsReturned: Array.isArray(data) ? data.length : undefined,
    });
    return data;
  } catch (error) {
    logProviderRequest({
      provider: "TCGPLAYER",
      operation,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      success: false,
      errorCode: error instanceof Error ? error.name : "Error",
    });
    throw error;
  }
}
