"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/pricing/money";
import { mergeTrackerChartData, rangeChangePercent } from "@/lib/tracker/chart-data";
import type { TrackerHistorySeries } from "@/lib/tracker/history";

const RANGES = ["7D", "30D", "90D", "1Y", "ALL"] as const;

type TrackerItem = {
  id: string;
  cardId: string;
  variantId: string | null;
  label: string;
  color: string;
  isVisible: boolean;
  latestValue: number | null;
  hasSnapshots: boolean;
};

type ResolveMatch = {
  cardId: string;
  variantId: string | null;
  label: string;
};

export function TrackerClient() {
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [maxSeries, setMaxSeries] = useState(8);
  const [range, setRange] = useState<(typeof RANGES)[number]>("30D");
  const [history, setHistory] = useState<TrackerHistorySeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [setName, setSetName] = useState("");
  const [setType, setSetType] = useState("");
  const [isFoil, setIsFoil] = useState("");
  const [year, setYear] = useState("");
  const [resolveMatches, setResolveMatches] = useState<ResolveMatch[]>([]);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [addMessage, setAddMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setAuthError(false);
    const res = await fetch("/api/tracker");
    if (res.status === 401) {
      setAuthError(true);
      setItems([]);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setItems(json.items ?? []);
    setMaxSeries(json.maxSeries ?? 8);
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    if (items.length === 0) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    const ids = items.map((i) => i.id).join(",");
    const res = await fetch(`/api/tracker/history?ids=${encodeURIComponent(ids)}&range=${range}`);
    const json = await res.json();
    setHistory(json.series ?? []);
    setHistoryLoading(false);
  }, [items, range]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const visibleItems = items.filter((i) => i.isVisible);
  const chartData = useMemo(() => {
    const visibleIds = new Set(visibleItems.map((i) => i.id));
    const filtered = history.filter((h) => visibleIds.has(h.seriesId));
    return mergeTrackerChartData(filtered);
  }, [history, visibleItems]);

  const rangeChanges = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const s of history) {
      map.set(s.seriesId, rangeChangePercent(s.points));
    }
    return map;
  }, [history]);

  async function resolveCards() {
    setResolveError(null);
    setResolveMatches([]);
    const params = new URLSearchParams({ cardNumber });
    if (setName) params.set("set", setName);
    if (setType) params.set("setType", setType);
    if (isFoil) params.set("isFoil", isFoil);
    if (year) params.set("year", year);
    const res = await fetch(`/api/cards/resolve?${params}`);
    if (!res.ok) {
      setResolveError("Could not resolve card identity.");
      return;
    }
    const json = await res.json();
    setResolveMatches(json.matches ?? []);
    if ((json.matches ?? []).length === 0) {
      setResolveError("No catalogue match. Refine filters or seed the catalog.");
    }
  }

  async function addSeries(match: ResolveMatch) {
    setAddMessage(null);
    if (items.length >= maxSeries) {
      setAddMessage(`Maximum ${maxSeries} series on one chart.`);
      return;
    }
    const res = await fetch("/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: match.cardId, variantId: match.variantId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAddMessage(json.error ?? "Could not add series.");
      return;
    }
    if (!json.hasSnapshots) {
      setAddMessage("No price history yet for this card. Refresh pricing from the card page.");
    }
    setAddOpen(false);
    await loadItems();
  }

  async function removeSeries(id: string) {
    await fetch(`/api/tracker/${id}`, { method: "DELETE" });
    await loadItems();
  }

  async function toggleVisibility(id: string, isVisible: boolean) {
    await fetch(`/api/tracker/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible }),
    });
    await loadItems();
  }

  if (authError) {
    return (
      <div className="rounded-xl border border-zinc-800 p-8 text-center">
        <p className="text-zinc-300">Sign in to use the price tracker.</p>
        <Link href="/login" className="mt-4 inline-block text-emerald-400 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" data-testid="tracker-range-chips" role="group" aria-label="History range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              data-testid={`tracker-range-${r}`}
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`rounded px-2 py-1 text-xs ${
                range === r ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-testid="tracker-add-open"
          onClick={() => {
            setAddOpen((v) => !v);
            setAddMessage(null);
          }}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
        >
          Add card
        </button>
      </div>

      {addOpen && (
        <section
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
          data-testid="tracker-add-panel"
        >
          <h2 className="text-sm font-medium text-zinc-300">Add by card identity</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs text-zinc-500">
              Card number
              <input
                data-testid="tracker-card-number"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </label>
            <label className="text-xs text-zinc-500">
              Set name or code
              <input
                data-testid="tracker-set"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
              />
            </label>
            <label className="text-xs text-zinc-500">
              Set type
              <select
                data-testid="tracker-set-type"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                value={setType}
                onChange={(e) => setSetType(e.target.value)}
              >
                <option value="">Any</option>
                <option value="MAIN">Main</option>
                <option value="PROMO">Promo</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Foil
              <select
                data-testid="tracker-foil"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                value={isFoil}
                onChange={(e) => setIsFoil(e.target.value)}
              >
                <option value="">Any</option>
                <option value="true">Foil</option>
                <option value="false">Non-foil</option>
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Year printed
              <input
                type="number"
                data-testid="tracker-year"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            data-testid="tracker-resolve"
            onClick={resolveCards}
            className="mt-3 rounded border border-zinc-700 px-3 py-1 text-sm"
          >
            Resolve
          </button>
          {resolveError && (
            <p className="mt-2 text-sm text-amber-400" data-testid="tracker-resolve-error">
              {resolveError}
            </p>
          )}
          {addMessage && (
            <p className="mt-2 text-sm text-amber-400" data-testid="tracker-add-message">
              {addMessage}
            </p>
          )}
          <ul className="mt-3 space-y-2" data-testid="tracker-resolve-matches">
            {resolveMatches.map((m) => (
              <li
                key={`${m.cardId}-${m.variantId ?? "raw"}`}
                className="flex items-center justify-between gap-2 rounded border border-zinc-800 px-3 py-2 text-sm"
                data-testid={`tracker-match-${m.cardId}`}
              >
                <span>{m.label}</span>
                <button
                  type="button"
                  data-testid={`tracker-add-${m.cardId}`}
                  onClick={() => addSeries(m)}
                  className="text-emerald-400 hover:underline"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="h-80" data-testid="tracker-chart">
          {loading || historyLoading ? (
            <p className="text-sm text-zinc-500">Loading chart…</p>
          ) : items.length === 0 ? (
            <div
              className="flex h-full flex-col items-center justify-center text-center"
              data-testid="tracker-empty"
            >
              <p className="text-zinc-300">Compare multiple cards on one chart.</p>
              <p className="mt-2 text-sm text-zinc-500">Add a card to start tracking COMBINED values.</p>
              <button
                type="button"
                data-testid="tracker-add-open-empty"
                onClick={() => setAddOpen(true)}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
              >
                Add card
              </button>
            </div>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-zinc-500" data-testid="tracker-no-history">
              No COMBINED snapshot history in this range yet. Refresh prices on card pages.
            </p>
          ) : (
            <div data-testid="tracker-chart-ready" className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#27272a" />
                  <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === "number" ? formatMoney(value) : String(value ?? "")
                    }
                    labelFormatter={(label) => String(label)}
                  />
                  <Legend />
                  {visibleItems.map((item) => (
                    <Line
                      key={item.id}
                      type="monotone"
                      dataKey={item.id}
                      name={item.label}
                      stroke={item.color}
                      dot={false}
                      connectNulls={false}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {items.length > 0 && (
        <section className="space-y-2" data-testid="tracker-series-list">
          <h2 className="text-sm font-medium text-zinc-400">Series</h2>
          <ul className="space-y-2">
            {items.map((item) => {
              const change = rangeChanges.get(item.id);
              return (
                <li
                  key={item.id}
                  data-testid={`tracker-series-${item.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 px-3 py-2 text-sm"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1" data-testid="tracker-series-label">
                    {item.label}
                  </span>
                  <span className="tabular-nums text-zinc-300">
                    {item.latestValue === null ? "—" : formatMoney(item.latestValue)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {change === null || change === undefined
                      ? "—"
                      : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                  </span>
                  <button
                    type="button"
                    data-testid={`tracker-hide-${item.id}`}
                    onClick={() => toggleVisibility(item.id, !item.isVisible)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    {item.isVisible ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    data-testid={`tracker-remove-${item.id}`}
                    onClick={() => removeSeries(item.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
