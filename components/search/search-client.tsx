"use client";

import Link from "next/link";
import { useState } from "react";

type CardResult = {
  id: string;
  name: string;
  cardNumber: string;
  imageUrl?: string | null;
  set: { name: string };
  variants: { id: string; variantName: string }[];
};

export function SearchClient() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/cards/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setResults(json.items ?? []);
    setLoading(false);
  }

  async function addToCollection(cardId: string, variantId?: string | null) {
    const res = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId,
        variantId: variantId ?? null,
        condition: "NEAR_MINT",
        gradingCompany: "RAW",
        quantity: 1,
      }),
    });
    if (res.status === 401) {
      alert("Sign in to add cards to your collection.");
      return;
    }
    if (res.ok) alert("Added to collection.");
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        role="search"
        aria-label="Card search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label className="sr-only" htmlFor="card-search-input">
          Search cards
        </label>
        <input
          id="card-search-input"
          data-testid="card-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Charizard, OP01-001…"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        />
        <button
          type="submit"
          data-testid="card-search-submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
        >
          Search
        </button>
      </form>
      {loading && (
        <p className="text-sm text-zinc-500" aria-live="polite">
          Searching…
        </p>
      )}
      <ul className="space-y-3" aria-label="Search results">
        {results.map((card) => (
          <li
            key={card.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 p-4"
          >
            <div>
              <Link href={`/cards/${card.id}`} className="font-medium hover:text-emerald-400">
                {card.name}
              </Link>
              <p className="text-xs text-zinc-500">
                {card.set.name} · {card.cardNumber}
              </p>
            </div>
            <button
              type="button"
              data-testid={`add-to-collection-${card.id}`}
              onClick={() => addToCollection(card.id, card.variants[0]?.id)}
              className="text-sm text-emerald-400 hover:underline"
            >
              Add to collection
            </button>
          </li>
        ))}
      </ul>
      {!loading && q && results.length === 0 && (
        <p className="text-sm text-zinc-500" role="status">
          No results. Try another query or seed the catalog.
        </p>
      )}
    </div>
  );
}
