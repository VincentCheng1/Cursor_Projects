import Link from "next/link";

import { PriceHistoryPageClient } from "@/components/charts/price-history-page-client";
import { AppShell } from "@/components/layout/app-shell";
import { getCardById } from "@/lib/cards/service";
import { cardPricingQuerySchema } from "@/lib/cards/pricing-params";
import { getPriceHistory } from "@/lib/pricing/services/price-history";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function PriceHistoryPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const cardId = first(raw.cardId);
  const query = cardPricingQuerySchema.parse({
    variantId: first(raw.variantId),
    condition: first(raw.condition),
    gradingCompany: first(raw.gradingCompany),
    grade: first(raw.grade),
  });
  const range = (first(raw.range) as "7D" | "30D" | "90D" | "1Y" | "ALL" | undefined) ?? "30D";

  const card = cardId ? await getCardById(cardId) : null;
  const history =
    card !== null
      ? await getPriceHistory({
          cardId: card.id,
          variantId: query.variantId,
          condition: query.condition ?? "NEAR_MINT",
          gradingCompany: query.gradingCompany ?? "RAW",
          grade: query.grade ?? null,
          range,
        })
      : [];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Price history</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Snapshot averages for an exact card identity (condition and grading included).
        </p>

        {!cardId && (
          <p className="mt-8 text-zinc-400" role="status">
            Open this page from a{" "}
            <Link href="/search" className="text-emerald-400 hover:underline">
              card
            </Link>{" "}
            with <code className="text-zinc-300">?cardId=…</code>, or use the chart on the card
            detail page.
          </p>
        )}

        {cardId && card === null && (
          <p className="mt-8 text-red-400" role="alert">
            Card not found.
          </p>
        )}

        {card !== null && (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-lg font-medium">{card.name}</h2>
              <p className="text-sm text-zinc-500">
                {card.set.name} · {card.cardNumber}
              </p>
              <Link
                href={`/cards/${card.id}${query.variantId ? `?variantId=${query.variantId}` : ""}`}
                className="mt-2 inline-block text-sm text-emerald-400 hover:underline"
              >
                Back to card
              </Link>
            </div>
            <PriceHistoryPageClient
              cardId={card.id}
              variantId={query.variantId}
              condition={query.condition ?? "NEAR_MINT"}
              gradingCompany={query.gradingCompany ?? "RAW"}
              grade={query.grade}
              initialRange={range}
              initialPoints={history.map((h) => ({
                calculatedAt: h.calculatedAt.toISOString(),
                averagePrice: h.averagePrice ? Number(h.averagePrice.toString()) : null,
              }))}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
