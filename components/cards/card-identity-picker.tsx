"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type { Condition, GradingCompany } from "@/lib/db/generated/client";

const CONDITIONS: Condition[] = [
  "NEAR_MINT",
  "LIGHTLY_PLAYED",
  "MODERATELY_PLAYED",
  "HEAVILY_PLAYED",
  "DAMAGED",
];

const GRADING: GradingCompany[] = ["RAW", "PSA", "CGC", "BGS", "SGC", "OTHER"];

const CONDITION_LABELS: Record<Condition, string> = {
  NEAR_MINT: "Near Mint",
  LIGHTLY_PLAYED: "Lightly Played",
  MODERATELY_PLAYED: "Moderately Played",
  HEAVILY_PLAYED: "Heavily Played",
  DAMAGED: "Damaged",
};

export function CardIdentityPicker({
  cardId,
  variants,
  selectedVariantId,
  condition,
  gradingCompany,
  grade,
  requireVariantChoice,
}: {
  cardId: string;
  variants: Array<{ id: string; variantName: string; printing: string | null; language: string }>;
  selectedVariantId?: string | null;
  condition: Condition;
  gradingCompany: GradingCompany;
  grade?: string | null;
  requireVariantChoice: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.replace(`/cards/${cardId}?${params.toString()}`);
    });
  }

  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      aria-label="Pricing identity"
      onSubmit={(e) => e.preventDefault()}
    >
      {variants.length > 0 && (
        <label className="block text-sm text-zinc-300">
          Variant
          <select
            data-testid="identity-variant"
            aria-required={requireVariantChoice}
            value={selectedVariantId ?? ""}
            disabled={pending}
            onChange={(e) => update({ variantId: e.target.value || undefined })}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
          >
            {requireVariantChoice && <option value="">Select a variant…</option>}
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.variantName}
                {v.printing ? ` · ${v.printing}` : ""}
                {v.language ? ` · ${v.language}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm text-zinc-300">
        Condition
        <select
          data-testid="identity-condition"
          value={condition}
          disabled={pending}
          onChange={(e) => update({ condition: e.target.value })}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {CONDITION_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm text-zinc-300">
        Grading
        <select
          data-testid="identity-grading"
          value={gradingCompany}
          disabled={pending}
          onChange={(e) =>
            update({
              gradingCompany: e.target.value,
              grade: e.target.value === "RAW" ? undefined : grade ?? undefined,
            })
          }
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        >
          {GRADING.map((g) => (
            <option key={g} value={g}>
              {g === "RAW" ? "Raw / Ungraded" : g}
            </option>
          ))}
        </select>
      </label>

      {gradingCompany !== "RAW" && (
        <label className="block text-sm text-zinc-300">
          Grade
          <input
            data-testid="identity-grade"
            value={grade ?? ""}
            disabled={pending}
            onChange={(e) => update({ grade: e.target.value || undefined })}
            placeholder="e.g. 10"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </label>
      )}
    </form>
  );
}
