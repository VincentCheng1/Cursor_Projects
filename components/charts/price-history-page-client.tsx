"use client";

import { PriceHistoryChart, type PricePoint } from "@/components/charts/price-history-chart";

export function PriceHistoryPageClient({
  cardId,
  variantId,
  condition,
  gradingCompany,
  grade,
  initialRange,
  initialPoints,
}: {
  cardId: string;
  variantId?: string;
  condition?: string;
  gradingCompany?: string;
  grade?: string;
  initialRange?: string;
  initialPoints?: PricePoint[];
}) {
  void initialRange;
  return (
    <PriceHistoryChart
      cardId={cardId}
      variantId={variantId}
      condition={condition}
      gradingCompany={gradingCompany}
      grade={grade}
      initialPoints={initialPoints}
    />
  );
}
