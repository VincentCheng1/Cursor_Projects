import { logProviderRequest } from "@/lib/logging/provider-logger";
import { waitForProviderSlot } from "@/lib/pricing/providers/rate-limit";

import { getEbayAccessToken } from "./auth";
import { ebayApiBase } from "./config";

export async function ebayRequest<T>(
  operation: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  await waitForProviderSlot("EBAY");
  const started = Date.now();
  const token = await getEbayAccessToken();
  const url = path.startsWith("http") ? path : `${ebayApiBase()}${path}`;

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
        provider: "EBAY",
        operation,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - started,
        success: false,
        errorCode: String(res.status),
      });
      throw new Error(`eBay ${operation} failed (${res.status})`);
    }

    const data = (await res.json()) as T;
    logProviderRequest({
      provider: "EBAY",
      operation,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      success: true,
    });
    return data;
  } catch (error) {
    logProviderRequest({
      provider: "EBAY",
      operation,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      success: false,
      errorCode: error instanceof Error ? error.name : "Error",
    });
    throw error;
  }
}
