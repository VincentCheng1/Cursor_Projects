"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatMoney } from "@/lib/pricing/money";

type Item = {
  id: string;
  quantity: number;
  condition: string;
  purchasePrice?: string | null;
  card: { id: string; name: string; cardNumber: string; imageUrl?: string | null; set: { name: string } };
  variant?: { variantName: string } | null;
  pricing: {
    currentValue: number | null;
    salesUsed: number;
    lastUpdated: string | null;
  };
};

type SortKey = "name" | "value" | "purchasePrice" | "recentlyAdded" | "recentlyUpdated";

export function CollectionClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [sort, setSort] = useState<SortKey>("recentlyAdded");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collection");
      if (res.status === 401) {
        setError("Authentication required");
        setItems([]);
        return;
      }
      const json = await res.json();
      setItems(json.items ?? []);
    } catch {
      setError("Failed to load collection");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items;
    if (needle) {
      list = list.filter(
        (i) =>
          i.card.name.toLowerCase().includes(needle) ||
          i.card.set.name.toLowerCase().includes(needle) ||
          i.card.cardNumber.toLowerCase().includes(needle),
      );
    }
    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.card.name.localeCompare(b.card.name);
        case "value":
          return (b.pricing.currentValue ?? 0) - (a.pricing.currentValue ?? 0);
        case "purchasePrice":
          return Number(b.purchasePrice ?? 0) - Number(a.purchasePrice ?? 0);
        case "recentlyUpdated":
          return 0;
        default:
          return 0;
      }
    });
    return sorted;
  }, [items, q, sort]);

  async function updateQuantity(id: string, quantity: number) {
    await fetch(`/api/collection/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    await load();
  }

  async function removeItem(id: string) {
    await fetch(`/api/collection/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-zinc-400">Loading collection…</p>;
  if (error) {
    return (
      <div className="rounded-xl border border-zinc-800 p-6 text-center">
        <p className="text-zinc-300">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-emerald-400 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 p-8 text-center">
        <p className="text-lg text-zinc-200">Your collection is empty.</p>
        <p className="mt-2 text-sm text-zinc-400">Search for a card to get started.</p>
        <Link href="/search" className="mt-4 inline-block text-emerald-400 hover:underline">
          Search cards
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search collection…"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        >
          <option value="recentlyAdded">Recently Added</option>
          <option value="name">Name</option>
          <option value="value">Value</option>
          <option value="purchasePrice">Purchase Price</option>
        </select>
        <button
          type="button"
          onClick={() => setView(view === "grid" ? "table" : "grid")}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
        >
          {view === "grid" ? "Table view" : "Grid view"}
        </button>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/prices/refresh-collection", { method: "POST" });
            await load();
          }}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white"
        >
          Refresh collection prices
        </button>
        <a
          href="/api/collection/export"
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
        >
          Export CSV
        </a>
        <label className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-sm">
          Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const csv = await file.text();
              const validate = await fetch("/api/collection/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ csv, commit: false }),
              });
              const preview = await validate.json();
              if (preview.errors?.length) {
                alert(`Import errors:\n${preview.errors.map((x: { row: number; message: string }) => `Row ${x.row}: ${x.message}`).join("\n")}`);
                return;
              }
              if (!confirm(`Import ${preview.validCount} items?`)) return;
              const commit = await fetch("/api/collection/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ csv, commit: true }),
              });
              const result = await commit.json();
              if (result.committed) {
                await load();
                alert(`Imported ${result.created} items.`);
              }
            }}
          />
        </label>
      </div>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 shadow"
            >
              <Link href={`/cards/${item.card.id}`} className="font-medium hover:text-emerald-400">
                {item.card.name}
              </Link>
              <p className="text-xs text-zinc-500">
                {item.card.set.name} · {item.card.cardNumber}
              </p>
              <p className="mt-2 text-lg tabular-nums">
                {item.pricing.currentValue === null
                  ? "—"
                  : formatMoney(item.pricing.currentValue)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-zinc-700 px-2"
                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                >
                  −
                </button>
                <span className="text-sm">{item.quantity}</span>
                <button
                  type="button"
                  className="rounded border border-zinc-700 px-2"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="ml-auto text-xs text-red-400"
                  onClick={() => removeItem(item.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Purchase</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2">
                    <Link href={`/cards/${item.card.id}`}>{item.card.name}</Link>
                  </td>
                  <td className="px-3 py-2 text-center">{item.quantity}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {item.pricing.currentValue === null
                      ? "—"
                      : formatMoney(item.pricing.currentValue)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {item.purchasePrice ? formatMoney(item.purchasePrice) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
