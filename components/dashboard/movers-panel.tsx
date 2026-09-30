"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  MOVER_PERIODS,
  type DashboardMovers,
  type MoverCard,
  type MoverPeriod,
  type MoverWindow,
} from "@/lib/dashboard/movers";
import { formatMoney } from "@/lib/pricing/money";

const PERIOD_LABELS: Record<MoverPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function MoverRows({
  rows,
  tone,
  empty,
  testIdPrefix,
}: {
  rows: MoverCard[];
  tone: "up" | "down";
  empty: string;
  testIdPrefix: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-zinc-500">{empty}</p>;
  }

  return (
    <ul className="mt-2 space-y-2" data-testid={testIdPrefix}>
      {rows.map((r) => (
        <li
          key={`${r.cardId}-${r.variantId ?? "null"}`}
          className="flex items-baseline justify-between gap-3 text-sm"
          data-testid={`${testIdPrefix}-row`}
        >
          <div className="min-w-0">
            <Link href={`/cards/${r.cardId}`} className="truncate text-zinc-200 hover:text-emerald-400">
              {r.cardName}
            </Link>
            <p className="truncate text-xs text-zinc-500">{r.setName}</p>
          </div>
          <div className="shrink-0 text-right tabular-nums">
            <p className={tone === "up" ? "text-emerald-400" : "text-red-400"}>
              {formatPct(r.percentChange)}
            </p>
            <p className="text-xs text-zinc-500">{formatMoney(r.absoluteChange)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MoverWindowCard({
  title,
  window,
  testId,
}: {
  title: string;
  window: MoverWindow;
  testId: string;
}) {
  return (
    <section
      className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
      data-testid={testId}
      aria-label={title}
    >
      <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
            Increasing most
          </h4>
          <MoverRows
            rows={window.gainers}
            tone="up"
            empty="No rising cards in this period."
            testIdPrefix={`${testId}-gainers`}
          />
        </div>
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-red-400/90">
            Decreasing most
          </h4>
          <MoverRows
            rows={window.decliners}
            tone="down"
            empty="No falling cards in this period."
            testIdPrefix={`${testId}-decliners`}
          />
        </div>
      </div>
    </section>
  );
}

export function MoversPanel() {
  const [period, setPeriod] = useState<MoverPeriod>("daily");
  const [data, setData] = useState<DashboardMovers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/dashboard/movers?period=${period}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setError("auth");
          setData(null);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError("load");
          setData(null);
          setLoading(false);
          return;
        }
        setData((await res.json()) as DashboardMovers);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("load");
          setData(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <section
      className="space-y-4"
      data-testid="dashboard-movers"
      aria-labelledby="dashboard-movers-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dashboard-movers-heading" className="text-lg font-medium text-zinc-100">
            Price movers
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Cards increasing and decreasing the most — market-wide and in your portfolio.
          </p>
        </div>
        <div
          className="flex gap-1 rounded-xl border border-zinc-800 p-1"
          role="tablist"
          aria-label="Mover period"
        >
          {MOVER_PERIODS.map((p) => {
            const selected = period === p;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={selected}
                data-testid={`movers-period-${p}`}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  selected
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => {
                  setPeriod(p);
                  setLoading(true);
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            );
          })}
        </div>
      </div>

      {error === "auth" && (
        <p className="text-sm text-zinc-400">
          <Link href="/login" className="text-emerald-400">
            Sign in
          </Link>{" "}
          to see movers.
        </p>
      )}
      {error === "load" && (
        <p className="text-sm text-red-400" role="alert">
          Could not load movers.
        </p>
      )}
      {loading && !error && (
        <p className="text-sm text-zinc-500" aria-live="polite">
          Loading movers…
        </p>
      )}
      {data && !error && (
        <div className="grid gap-4 lg:grid-cols-2" data-testid="movers-windows">
          <MoverWindowCard title="Market movers" window={data.market} testId="market-movers" />
          <MoverWindowCard
            title="Personal portfolio"
            window={data.portfolio}
            testId="portfolio-movers"
          />
        </div>
      )}
    </section>
  );
}
