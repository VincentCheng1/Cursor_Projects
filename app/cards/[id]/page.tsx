import Image from "next/image";
import { notFound } from "next/navigation";

import { CardDetailActions } from "@/components/cards/card-detail-actions";
import { PriceHistoryChart } from "@/components/charts/price-history-chart";
import { AppShell } from "@/components/layout/app-shell";
import { SourceBreakdown } from "@/components/pricing/source-breakdown";
import { ValueDisplay } from "@/components/pricing/value-display";
import { ViewSalesUsed } from "@/components/pricing/view-sales-used";
import { resolvePricingIdentity } from "@/lib/cards/resolve-identity";
import { getCardById } from "@/lib/cards/service";
import { computeCardPrice } from "@/lib/pricing/services/compute-card-price";
import { getLatestPricesForCard } from "@/lib/pricing/services/latest-prices";
import { getPriceHistory } from "@/lib/pricing/services/price-history";

type PageProps = { params: Promise<{ id: string }> };

export default async function CardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const card = await getCardById(id);
  if (card === null) notFound();

  const variant = card.variants[0] ?? null;
  const identity = await resolvePricingIdentity({
    cardId: card.id,
    variantId: variant?.id,
  });
  if (identity === null) notFound();

  const latest = await getLatestPricesForCard({
    cardId: card.id,
    variantId: variant?.id,
    condition: identity.condition,
    gradingCompany: identity.gradingCompany,
    grade: identity.grade,
  });

  const live = await computeCardPrice(identity);
  const combined = live.combined;
  const displayValue = latest.COMBINED?.averagePrice ?? combined.average;
  const displaySalesUsed = latest.COMBINED?.salesUsed ?? combined.salesUsed;
  const lastUpdated = latest.COMBINED?.calculatedAt ?? null;

  const history = await getPriceHistory({
    cardId: card.id,
    variantId: variant?.id,
    range: "30D",
  });

  const breakdownRows = [
    {
      label: "TCGplayer",
      average: live.bySource.TCGPLAYER?.average ?? latest.TCGPLAYER?.averagePrice ?? null,
      salesUsed: live.bySource.TCGPLAYER?.salesUsed ?? latest.TCGPLAYER?.salesUsed ?? 0,
    },
    {
      label: "eBay",
      average: live.bySource.EBAY?.average ?? latest.EBAY?.averagePrice ?? null,
      salesUsed: live.bySource.EBAY?.salesUsed ?? latest.EBAY?.salesUsed ?? 0,
    },
    {
      label: "Combined",
      average: displayValue,
      salesUsed: displaySalesUsed,
      emphasize: true,
    },
  ];

  const usedSales = combined.usedSales.map((u) => ({
    source: u.sale.source,
    saleDate: u.sale.saleDate.toISOString(),
    condition: u.sale.condition,
    gradingCompany: u.sale.gradingCompany,
    grade: u.sale.grade,
    salePrice: u.sale.salePrice,
    shippingPrice: u.sale.shippingPrice,
    totalPrice: u.sale.totalPrice,
    effectivePrice: u.effectivePrice,
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex flex-col gap-6 md:flex-row">
          {card.imageUrl && (
            <Image
              src={card.imageUrl}
              alt={card.name}
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
          </div>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-medium text-zinc-400">Current value</h2>
            <div className="mt-3">
              <ValueDisplay
                value={displayValue}
                salesUsed={displaySalesUsed}
                lastUpdated={lastUpdated}
              />
            </div>
            <CardDetailActions cardId={card.id} variantId={variant?.id} />
            <ViewSalesUsed
              usedSales={usedSales}
              oldestSaleDate={combined.oldestSaleDate?.toISOString()}
              newestSaleDate={combined.newestSaleDate?.toISOString()}
            />
          </div>
          <SourceBreakdown rows={breakdownRows} />
        </section>

        <section className="mt-10">
          <PriceHistoryChart
            cardId={card.id}
            variantId={variant?.id}
            initialPoints={history.map((h) => ({
              calculatedAt: h.calculatedAt.toISOString(),
              averagePrice: h.averagePrice ? Number(h.averagePrice.toString()) : null,
            }))}
          />
        </section>
      </div>
    </AppShell>
  );
}
