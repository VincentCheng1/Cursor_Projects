"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RANGES = ["7D", "30D", "90D", "1Y", "ALL"] as const;

export type PricePoint = { calculatedAt: string; averagePrice: number | null };

export function PriceHistoryChart({
  cardId,
  variantId,
  condition,
  gradingCompany,
  grade,
  initialPoints,
}: {
  cardId: string;
  variantId?: string;
  condition?: string;
  gradingCompany?: string;
  grade?: string;
  initialPoints?: PricePoint[];
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("30D");
  const [points, setPoints] = useState<PricePoint[]>(initialPoints ?? []);
  const [loading, setLoading] = useState(false);

  const chartData = useMemo(
    () =>
      points
        .filter((p) => p.averagePrice !== null)
        .map((p) => ({
          date: new Date(p.calculatedAt).toLocaleDateString(),
          value: p.averagePrice as number,
        })),
    [points],
  );

  async function loadRange(r: (typeof RANGES)[number]) {
    setRange(r);
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: r });
      if (variantId) params.set("variantId", variantId);
      if (condition) params.set("condition", condition);
      if (gradingCompany) params.set("gradingCompany", gradingCompany);
      if (grade) params.set("grade", grade);
      const res = await fetch(`/api/price-history/${cardId}?${params}`);
      const json = await res.json();
      setPoints(json.points ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-zinc-300">Price history</h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => loadRange(r)}
              className={`rounded px-2 py-1 text-xs ${
                range === r ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 h-64">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-zinc-500">No price history for this range yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#34d399" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
