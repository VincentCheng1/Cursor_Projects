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

type Diagnostics = {
  tcgplayer?: { displayName: string; health: { status: string; message?: string } };
  ebay?: { displayName: string; health: { status: string; message?: string } };
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
  return health.message ?? health.status;
}

export function DiagnosticsClient() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
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
      };
      if (!res.ok) {
        setSyncMessage(json.error ?? "Sync failed.");
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void runPublicDataSync()}
          disabled={syncing}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
          Authorized marketplace APIs only — never HTML scraping.
        </p>
      </div>
      {syncMessage && <p className="text-sm text-zinc-300">{syncMessage}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-medium">Pricing providers</h2>
            <ul className="space-y-1 text-sm text-zinc-300">
              <li>
                TCGplayer: {data.tcgplayer ? healthLabel(data.tcgplayer.health) : "—"}
              </li>
              <li>eBay: {data.ebay ? healthLabel(data.ebay.health) : "—"}</li>
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
