type LogLevel = "info" | "warn" | "error";

export interface ProviderLogEntry {
  provider: string;
  operation: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  recordsReturned?: number;
  errorCode?: string;
}

export function logProviderRequest(entry: ProviderLogEntry): void {
  const level: LogLevel = entry.success ? "info" : "error";
  const payload = {
    ...entry,
    kind: "provider_request",
  };
  if (level === "info") {
    console.info(JSON.stringify(payload));
  } else {
    console.error(JSON.stringify(payload));
  }
}
