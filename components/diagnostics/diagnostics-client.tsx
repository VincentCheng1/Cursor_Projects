"use client";

import { useCallback, useEffect, useState } from "react";

type Surface = {
  provider: string;
  surface: string;
  displayName: string;
  health: { status: string; message?: string };
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  rowCount: number;
};

type ProviderDetail = {
  displayName: string;
  health: { status: string; message?: string };
  credentialsConfigured?: boolean;
  missingEnvVars?: string[];
  statusMessage?: string;
};

type SyncReadiness = {
  canRunPublicDataSync: boolean;
  canRefreshPrices: boolean;
  summary: string;
  nextSteps: string[];
  providers: Array<{
    id: string;
    displayName: string;
    configured: boolean;
    missingEnvVars: string[];
    statusMessage: string;
    surfacesThatWouldRun: string[];
  }>;
  surfacesEnabled: Array<{ provider: string; surface: string }>;
  dryRun: true;
  checkedAt: string;
};

type Diagnostics = {
  tcgplayer?: ProviderDetail;
  ebay?: ProviderDetail;
  syncReadiness?: SyncReadiness;
  publicDataSurfaces?: Surface[];
  catalogCounts?: {
    games: number;
    sets: number;
    cards: number;
    variants: number;
    sales: number;
  };
  database?: { status: string };
  backgroundJobs?: Array<{
    id: string;
    provider: string;
    type: string;
    status: string;
    recordsProcessed: number;
    recordsFailed: number;
    errorMessage: string | null;
    completedAt: string | null;
  }>;
};

function healthLabel(health: { status: string; message?: string }) {
  if (health.status === "READY") return "Ready";
  if (health.status === "NOT_CONFIGURED") return health.message ?? "Not configured";
  if (health.status === "NEVER_SYNCED") return health.message ?? "Never synced";
  if (health.status === "UNAVAILABLE") return health.message ?? "Unavailable";
  return health.message ?? health.status;
}

function providerLine(label: string, detail?: ProviderDetail) {
  if (!detail) return `${label}: —`;
  // Prefer explicit price-provider health when sales are unavailable (e.g. TCGCSV).
  if (detail.health.status === "UNAVAILABLE") {
    return `${label}: ${healthLabel(detail.health)}`;
  }
  const configured = detail.credentialsConfigured;
  if (configured === true) {
    return `${label}: Configured — ${detail.statusMessage ?? "Ready for authorized API calls."}`;
  }
  if (configured === false) {
    const missing =
      detail.missingEnvVars && detail.missingEnvVars.length > 0
        ? ` Missing: ${detail.missingEnvVars.join(", ")}.`
        : "";
    return `${label}: Not configured.${missing} ${detail.statusMessage ?? healthLabel(detail.health)}`;
  }
  return `${label}: ${healthLabel(detail.health)}`;
}

export function DiagnosticsClient() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/diagnostics");
    if (!res.ok) {
      setError("Unable to load diagnostics.");
      return;
    }
    setData(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function checkSyncReadiness() {
    setChecking(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/admin/public-data-sync?dryRun=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const json = (await res.json()) as {
        error?: string;
        note?: string;
        readiness?: SyncReadiness;
        status?: string;
      };
      if (!res.ok) {
        setSyncMessage(json.error ?? "Readiness check failed.");
        return;
      }
      const summary = json.readiness?.summary ?? json.note ?? "Readiness checked.";
      const steps = json.readiness?.nextSteps?.slice(0, 3).join(" ") ?? "";
      setSyncMessage(`Sync readiness (dry-run): ${summary}${steps ? ` Next: ${steps}` : ""}`);
      await load();
    } catch {
      setSyncMessage("Readiness check request failed.");
    } finally {
      setChecking(false);
    }
  }

  async function runPublicDataSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/admin/public-data-sync", { method: "POST" });
      const json = (await res.json()) as {
        error?: string;
        status?: string;
        note?: string;
        outcome?: { processed?: number; failed?: number; errors?: string[] };
        readiness?: SyncReadiness;
      };
      if (!res.ok) {
        setSyncMessage(json.error ?? "Sync failed.");
        return;
      }
      if (json.status === "BLOCKED_NOT_CONFIGURED") {
        setSyncMessage(
          `${json.note ?? "Blocked — providers not configured."} ${json.readiness?.summary ?? ""}`,
        );
        await load();
        return;
      }
      const processed = json.outcome?.processed ?? 0;
      const failed = json.outcome?.failed ?? 0;
      setSyncMessage(
        `Public data sync ${json.status ?? "done"} — processed ${processed}, failed ${failed}. ${json.note ?? ""}`,
      );
      await load();
    } catch {
      setSyncMessage("Sync request failed.");
    } finally {
      setSyncing(false);
    }
  }

  const canSync = data?.syncReadiness?.canRunPublicDataSync === true;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void checkSyncReadiness()}
          disabled={checking}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 disabled:opacity-50"
        >
          {checking ? "Checking readiness…" : "Check sync readiness"}
        </button>
        <button
          type="button"
          onClick={() => void runPublicDataSync()}
          disabled={syncing || data?.syncReadiness?.canRunPublicDataSync === false}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          title={
            canSync
              ? "Run authorized public data ingest"
              : "Set TCGplayer and/or eBay credentials first"
          }
        >
          {syncing ? "Running public data sync…" : "Run public data sync"}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300"
        >
          Refresh
        </button>
        <p className="text-xs text-zinc-500">
          Authorized marketplace APIs only — never HTML scraping. Dry-run never invents catalog
          data.
        </p>
      </div>
      {syncMessage && <p className="text-sm text-zinc-300">{syncMessage}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-medium">Sync readiness</h2>
            <p className="text-sm text-zinc-300">{data.syncReadiness?.summary ?? "—"}</p>
            <ul className="list-inside list-disc space-y-1 text-xs text-zinc-500">
              {(data.syncReadiness?.nextSteps ?? []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            {!canSync && (
              <p className="text-sm text-amber-400/90">
                Public data sync is disabled until credentials are set. Seeded games remain
                searchable; CardVault will not invent marketplace cards or sales.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Pricing providers</h2>
            <ul className="space-y-1 text-sm text-zinc-300">
              <li>{providerLine("TCGplayer", data.tcgplayer)}</li>
              <li>{providerLine("eBay", data.ebay)}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Public data surfaces</h2>
            <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
              {(data.publicDataSurfaces ?? []).map((s) => (
                <li key={`${s.provider}-${s.surface}`} className="px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">{s.displayName}</span>
                    <span className="text-zinc-400">{s.health.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{healthLabel(s.health)}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Rows: {s.rowCount}
                    {s.lastSuccessAt ? ` · Last success: ${s.lastSuccessAt}` : ""}
                    {s.lastErrorMessage ? ` · Last error: ${s.lastErrorMessage}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Catalog counts</h2>
            <p className="text-sm text-zinc-300">
              Games {data.catalogCounts?.games ?? 0} · Sets {data.catalogCounts?.sets ?? 0} ·
              Cards {data.catalogCounts?.cards ?? 0} · Variants{" "}
              {data.catalogCounts?.variants ?? 0} · Sales {data.catalogCounts?.sales ?? 0}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Database</h2>
            <p className="text-sm text-zinc-300">Status: {data.database?.status ?? "unknown"}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Background jobs</h2>
            <ul className="space-y-2 text-sm text-zinc-300">
              {(data.backgroundJobs ?? []).map((job) => (
                <li key={job.id} className="rounded-lg border border-zinc-800 px-3 py-2">
                  <span className="font-medium">{job.type}</span> · {job.status} · processed{" "}
                  {job.recordsProcessed}/{job.recordsFailed} failed
                  {job.errorMessage ? (
                    <span className="block text-xs text-red-400">{job.errorMessage}</span>
                  ) : null}
                </li>
              ))}
              {(data.backgroundJobs ?? []).length === 0 && (
                <li className="text-zinc-500">No recent jobs.</li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
