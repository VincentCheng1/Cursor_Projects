"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MoversPanel } from "@/components/dashboard/movers-panel";
import { formatMoney } from "@/lib/pricing/money";

type Row = {
  id: string;
  cardId: string;
  cardName: string;
  profit: number | null;
  currentCardValue: number | null;
  purchasePrice: number | null;
  quantity: number;
};

type Metrics = {
  collectionValue: number;
  totalInvested: number;
  profit: number;
  roi: number | null;
  cardsOwned: number;
  uniqueCards: number;
  pokemonValue: number;
  onePieceValue: number;
  topGainers: Row[];
  topDecliners: Row[];
  withoutPricing: { id: string; cardName: string }[];
};

function MoverList({
  title,
  rows,
  tone,
  empty,
}: {
  title: string;
  rows: Row[];
  tone: "up" | "down";
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 p-4" aria-labelledby={`${tone}-heading`}>
      <h2 id={`${tone}-heading`} className="text-sm font-medium text-zinc-300">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => {
            const delta =
              r.purchasePrice !== null && r.currentCardValue !== null
                ? (r.currentCardValue - r.purchasePrice) * r.quantity
                : r.profit;
            return (
              <li key={r.id} className="flex items-baseline justify-between gap-3 text-sm">
                <Link href={`/cards/${r.cardId}`} className="truncate text-zinc-200 hover:text-emerald-400">
                  {r.cardName}
                </Link>
                <span
                  className={`shrink-0 tabular-nums ${
                    tone === "up" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {delta === null ? "—" : formatMoney(delta)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function DashboardClient() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (res.status === 401) {
          setError("auth");
          return;
        }
        setData(await res.json());
      })
      .catch(() => setError("load"));
  }, []);

  if (error === "auth") {
    return (
      <p className="text-zinc-400">
        <Link href="/login" className="text-emerald-400">
          Sign in
        </Link>{" "}
        to view your dashboard.
      </p>
    );
  }
  if (error === "load") {
    return (
      <p className="text-red-400" role="alert">
        Could not load dashboard.
      </p>
    );
  }
  if (!data) {
    return (
      <p className="text-zinc-400" aria-live="polite">
        Loading dashboard…
      </p>
    );
  }

  const gameChart = [
    { game: "Pokémon", value: data.pokemonValue },
    { game: "One Piece", value: data.onePieceValue },
  ];

  return (
    <div className="space-y-8">
      <MoversPanel />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Collection summary">
        {[
          {
            label: "Collection value",
            testId: "dashboard-collection-value",
            value: formatMoney(data.collectionValue),
          },
          {
            label: "Total invested",
            testId: "dashboard-total-invested",
            value: formatMoney(data.totalInvested),
          },
          {
            label: "Profit / loss",
            testId: "dashboard-profit",
            value: formatMoney(data.profit),
            tone: data.profit >= 0 ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "ROI",
            testId: "dashboard-roi",
            value: data.roi === null ? "N/A" : `${data.roi.toFixed(2)}%`,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p
              data-testid={s.testId}
              className={`mt-2 text-2xl font-semibold tabular-nums ${s.tone ?? ""}`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 p-4">
          <p className="text-sm text-zinc-400">Cards owned</p>
          <p className="text-3xl font-semibold">{data.cardsOwned}</p>
          <p className="mt-2 text-sm text-zinc-500">{data.uniqueCards} unique cards</p>
        </div>
        <div className="h-48 rounded-2xl border border-zinc-800 p-4">
          <p className="mb-2 text-sm text-zinc-400">Value by game</p>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={gameChart}>
              <XAxis dataKey="game" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Top movers">
        <MoverList
          title="Top gainers"
          rows={data.topGainers ?? []}
          tone="up"
          empty="No gainers yet — add purchase prices to see profit movers."
        />
        <MoverList
          title="Top decliners"
          rows={data.topDecliners ?? []}
          tone="down"
          empty="No decliners yet — add purchase prices to see loss movers."
        />
      </section>

      {data.withoutPricing.length > 0 && (
        <section className="rounded-2xl border border-zinc-800 p-4" aria-labelledby="no-price-heading">
          <h2 id="no-price-heading" className="text-sm font-medium">
            Cards without pricing data
          </h2>
          <ul className="mt-2 text-sm text-zinc-400">
            {data.withoutPricing.map((c) => (
              <li key={c.id}>{c.cardName}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
