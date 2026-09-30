import { logProviderRequest } from "@/lib/logging/provider-logger";
import { waitForProviderSlot } from "@/lib/pricing/providers/rate-limit";

import { tcgcsvBaseUrl, tcgcsvMinIntervalMs, tcgcsvUserAgent } from "./config";

export class TcgCsvHttpError extends Error {
  readonly status: number;

  constructor(operation: string, status: number) {
    super(`TCGCSV ${operation} failed (${status})`);
    this.name = "TcgCsvHttpError";
    this.status = status;
  }
}

async function tcgcsvFetch(
  operation: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  await waitForProviderSlot("TCGCSV", tcgcsvMinIntervalMs());
  const started = Date.now();
  const url = path.startsWith("http") ? path : `${tcgcsvBaseUrl()}${path}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json, text/csv;q=0.9, text/plain;q=0.8, */*;q=0.5",
        "User-Agent": tcgcsvUserAgent(),
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      logProviderRequest({
        provider: "TCGCSV",
        operation,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - started,
        success: false,
        errorCode: String(res.status),
        recordsReturned: 0,
      });
      throw new TcgCsvHttpError(operation, res.status);
    }

    // Attach started time for callers to log success after body parse.
    (res as Response & { __tcgcsvStarted?: number }).__tcgcsvStarted = started;
    return res;
  } catch (error) {
    if (!(error instanceof TcgCsvHttpError)) {
      logProviderRequest({
        provider: "TCGCSV",
        operation,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - started,
        success: false,
        errorCode: error instanceof Error ? error.name : "Error",
      });
    }
    throw error;
  }
}

function startedOf(res: Response): number {
  return (res as Response & { __tcgcsvStarted?: number }).__tcgcsvStarted ?? Date.now();
}

/** Server-side GET of a TCGCSV JSON collection (no marketplace secrets). */
export async function tcgcsvRequestJson<T>(operation: string, path: string): Promise<T> {
  const res = await tcgcsvFetch(operation, path);
  const data = (await res.json()) as T;
  logProviderRequest({
    provider: "TCGCSV",
    operation,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedOf(res),
    success: true,
    recordsReturned: Array.isArray((data as { results?: unknown }).results)
      ? ((data as { results: unknown[] }).results?.length ?? 0)
      : undefined,
  });
  return data;
}

/** Server-side GET of a TCGCSV text/CSV body. */
export async function tcgcsvRequestText(operation: string, path: string): Promise<string> {
  const res = await tcgcsvFetch(operation, path);
  const text = await res.text();
  logProviderRequest({
    provider: "TCGCSV",
    operation,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedOf(res),
    success: true,
  });
  return text;
}
