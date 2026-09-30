import { logProviderRequest } from "@/lib/logging/provider-logger";
import { waitForProviderSlot } from "@/lib/pricing/providers/rate-limit";
import { ProviderUnavailableError } from "@/lib/pricing/providers/errors";

import { tcaApiBase, tcaApiKey } from "./config";

export type TcaHttpOptions = {
  operation: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
};

/**
 * Authenticated GET against The Card API Market base.
 * Fail-closed: missing key, non-2xx, or invalid JSON throw — never invent data.
 */
export async function tcaGetJson<T>(options: TcaHttpOptions): Promise<T> {
  const key = tcaApiKey();
  if (key === undefined) {
    throw new ProviderUnavailableError("The Card API", "TCA_API_KEY is not set.");
  }

  await waitForProviderSlot("TCA");
  const started = Date.now();

  const url = new URL(`${tcaApiBase()}${options.path.startsWith("/") ? "" : "/"}${options.path}`);
  if (options.query !== undefined) {
    for (const [name, value] of Object.entries(options.query)) {
      if (value === undefined) continue;
      url.searchParams.set(name, String(value));
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-market-api-key": key,
      },
      redirect: "follow",
    });
  } catch (error) {
    logProviderRequest({
      provider: "TCA",
      operation: options.operation,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      success: false,
      errorCode: "NETWORK",
    });
    throw new ProviderUnavailableError(
      "The Card API",
      error instanceof Error ? error.message : "Network error",
    );
  }

  if (!res.ok) {
    logProviderRequest({
      provider: "TCA",
      operation: options.operation,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      success: false,
      errorCode: String(res.status),
    });
    throw new ProviderUnavailableError(
      "The Card API",
      `HTTP ${res.status} from ${options.operation}`,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    logProviderRequest({
      provider: "TCA",
      operation: options.operation,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      success: false,
      errorCode: "INVALID_JSON",
    });
    throw new ProviderUnavailableError("The Card API", "Invalid JSON response");
  }

  logProviderRequest({
    provider: "TCA",
    operation: options.operation,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - started,
    success: true,
    recordsReturned: Array.isArray((json as { data?: unknown }).data)
      ? ((json as { data: unknown[] }).data.length)
      : undefined,
  });

  return json as T;
}
