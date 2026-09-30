"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CardDetailActions({
  cardId,
  variantId,
}: {
  cardId: string;
  variantId?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setMessage(null);
    const params = new URLSearchParams();
    if (variantId) params.set("variantId", variantId);
    const res = await fetch(`/api/prices/refresh/${cardId}?${params}`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Refresh failed");
      return;
    }
    setMessage(json.refreshed ? "Price updated." : json.message);
    router.refresh();
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={refresh}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
      >
        Refresh price
      </button>
      {message && <p className="mt-2 text-sm text-zinc-400">{message}</p>}
    </div>
  );
}
