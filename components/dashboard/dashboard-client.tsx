"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatMoney } from "@/lib/pricing/money";

type Metrics = {
  collectionValue: number;
  totalInvested: number;
  profit: number;
  roi: number | null;
  cardsOwned: number;
  uniqueCards: number;
  pokemonValue: number;
  onePieceValue: number;
  withoutPricing: { id: string; cardName: string }[];
};

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
        <Link href="/login" className="text-emerald-400">Sign in</Link> to view your dashboard.
      </p>
    );
  }
  if (!data) return <p className="text-zinc-400">Loading dashboard…</p>;

  const gameChart = [
    { game: "Pokémon", value: data.pokemonValue },
    { game: "One Piece", value: data.onePieceValue },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {data.withoutPricing.length > 0 && (
        <section className="rounded-2xl border border-zinc-800 p-4">
          <h2 className="text-sm font-medium">Cards without pricing data</h2>
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
