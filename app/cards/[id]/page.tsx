import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CardDetailActions } from "@/components/cards/card-detail-actions";
import { CardIdentityPicker } from "@/components/cards/card-identity-picker";
import { PriceHistoryChart } from "@/components/charts/price-history-chart";
import { AppShell } from "@/components/layout/app-shell";
import { SourceBreakdown } from "@/components/pricing/source-breakdown";
import { ValueDisplay } from "@/components/pricing/value-display";
import { ViewSalesUsed } from "@/components/pricing/view-sales-used";
import { cardPricingQuerySchema } from "@/lib/cards/pricing-params";
import {
  isVariantSelectionRequired,
  resolvePricingIdentity,
} from "@/lib/cards/resolve-identity";
import { getCardById } from "@/lib/cards/service";
import { computeCardPrice } from "@/lib/pricing/services/compute-card-price";
import { getLatestPricesForCard } from "@/lib/pricing/services/latest-prices";
import { snapshotTimestampMatchesLive } from "@/lib/pricing/services/live-vs-snapshot";
import { getPriceHistory } from "@/lib/pricing/services/price-history";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CardDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const raw = await searchParams;
  const card = await getCardById(id);
  if (card === null) notFound();

  const query = cardPricingQuerySchema.parse({
    variantId: first(raw.variantId),
    condition: first(raw.condition),
    gradingCompany: first(raw.gradingCompany),
    grade: first(raw.grade),
  });

  const needsVariant = isVariantSelectionRequired(card, query.variantId);
  const identity = needsVariant
    ? null
    : await resolvePricingIdentity({
        cardId: card.id,
        variantId: query.variantId,
        condition: query.condition,
        gradingCompany: query.gradingCompany,
        grade: query.grade,
      });

  const condition = identity?.condition ?? query.condition ?? "NEAR_MINT";
  const gradingCompany = identity?.gradingCompany ?? query.gradingCompany ?? "RAW";
  const grade = identity?.grade ?? query.grade ?? null;
  const variant = identity?.variant ?? null;

  const live = identity !== null ? await computeCardPrice(identity) : null;
  const combined = live?.combined ?? null;
  // Live compute is the card-page source of truth for value + salesUsed so the
  // headline matches View Sales Used (pricing-pipeline P1). Collection /
  // dashboard still read COMBINED snapshots until refresh.
  const displayValue = combined?.average ?? null;
  const displaySalesUsed = combined?.salesUsed ?? 0;

  const latest =
    identity !== null
      ? await getLatestPricesForCard({
          cardId: card.id,
          variantId: variant?.id,
          condition,
          gradingCompany,
          grade,
        })
      : null;
  const snapshot = latest?.COMBINED ?? null;
  // Only attach snapshot "Last updated" when it describes the same number as
  // the live headline — otherwise a stale timestamp next to a live value
  // disagrees with collection/dashboard snapshot surfaces.
  const lastUpdated = snapshotTimestampMatchesLive({
    liveAverage: displayValue,
    liveSalesUsed: displaySalesUsed,
    snapshotAverage: snapshot?.averagePrice,
    snapshotSalesUsed: snapshot?.salesUsed,
  })
    ? (snapshot?.calculatedAt ?? null)
    : null;

  const history =
    identity !== null
      ? await getPriceHistory({
          cardId: card.id,
          variantId: variant?.id,
          condition,
          gradingCompany,
          grade,
          range: "30D",
        })
      : [];

  const breakdownRows = [
    {
      label: "TCGplayer",
      average: live?.bySource.TCGPLAYER?.average ?? null,
      salesUsed: live?.bySource.TCGPLAYER?.salesUsed ?? 0,
    },
    {
      label: "eBay",
      average: live?.bySource.EBAY?.average ?? null,
      salesUsed: live?.bySource.EBAY?.salesUsed ?? 0,
    },
    {
      label: "Combined",
      average: displayValue,
      salesUsed: displaySalesUsed,
      emphasize: true,
    },
  ];

  const usedSales =
    combined?.usedSales.map((u) => ({
      source: u.sale.source,
      saleDate: u.sale.saleDate.toISOString(),
      condition: u.sale.condition,
      gradingCompany: u.sale.gradingCompany,
      grade: u.sale.grade,
      salePrice: u.sale.salePrice,
      shippingPrice: u.sale.shippingPrice,
      totalPrice: u.sale.totalPrice,
      effectivePrice: u.effectivePrice,
    })) ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex flex-col gap-6 md:flex-row">
          {card.imageUrl && (
            <Image
              src={card.imageUrl}
              alt={`${card.name} card art`}
              width={220}
              height={308}
              className="rounded-xl border border-zinc-800 object-cover"
            />
          )}
          <div>
            <h1 className="text-3xl font-semibold">{card.name}</h1>
            <p className="mt-1 text-zinc-400">
              {card.set.name} · {card.cardNumber}
              {card.rarity ? ` · ${card.rarity}` : ""}
            </p>
            {variant && (
              <p className="mt-1 text-sm text-zinc-500">Variant: {variant.variantName}</p>
            )}
            <Suspense fallback={null}>
              <CardIdentityPicker
                cardId={card.id}
                variants={card.variants}
                selectedVariantId={variant?.id ?? query.variantId}
                condition={condition}
                gradingCompany={gradingCompany}
                grade={grade}
                requireVariantChoice={needsVariant}
              />
            </Suspense>
          </div>
        </header>

        {needsVariant ? (
          <section className="mt-10 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-6" role="status">
            <h2 className="text-lg font-medium text-amber-200">Choose a variant to price</h2>
            <p className="mt-2 text-sm text-zinc-400">
              This card has multiple variants. CardVault will not guess which one to average —
              select a variant above to load a value for that exact identity.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-10 grid gap-8 lg:grid-cols-2" aria-labelledby="current-value-heading">
              <div>
                <h2 id="current-value-heading" className="text-sm font-medium text-zinc-400">
                  Current value
                </h2>
                <div className="mt-3">
                  <ValueDisplay
                    value={displayValue}
                    salesUsed={displaySalesUsed}
                    lastUpdated={lastUpdated}
                  />
                </div>
                <CardDetailActions
                  cardId={card.id}
                  variantId={variant?.id}
                  condition={condition}
                  gradingCompany={gradingCompany}
                  grade={grade ?? undefined}
                />
                <ViewSalesUsed
                  usedSales={usedSales}
                  oldestSaleDate={combined?.oldestSaleDate?.toISOString()}
                  newestSaleDate={combined?.newestSaleDate?.toISOString()}
                />
              </div>
              <SourceBreakdown rows={breakdownRows} />
            </section>

            <section className="mt-10" aria-labelledby="price-history-heading">
              <h2 id="price-history-heading" className="sr-only">
                Price history
              </h2>
              <PriceHistoryChart
                cardId={card.id}
                variantId={variant?.id}
                condition={condition}
                gradingCompany={gradingCompany}
                grade={grade ?? undefined}
                initialPoints={history.map((h) => ({
                  calculatedAt: h.calculatedAt.toISOString(),
                  averagePrice: h.averagePrice ? Number(h.averagePrice.toString()) : null,
                }))}
              />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
