import { calculateItemValue, calculateProfit, calculateROI } from "@/lib/pricing/calculator/collectionValue";
import { COLLECTION_CSV_COLUMNS } from "./csv-columns";
import { escapeCsvCell } from "./csv-parse";
import type { enrichCollectionItem } from "./enrich";

type EnrichedItem = Awaited<ReturnType<typeof enrichCollectionItem>>;

export function buildCollectionCsv(items: EnrichedItem[]): string {
  const lines = [COLLECTION_CSV_COLUMNS.join(",")];

  for (const item of items) {
    const current = item.pricing.currentValue;
    const purchase =
      item.purchasePrice === null ? null : Number(item.purchasePrice.toString());
    const itemValue = calculateItemValue({
      quantity: item.quantity,
      currentCardValue: current,
    });
    const profit =
      purchase === null || current === null
        ? null
        : calculateProfit(itemValue, purchase * item.quantity);
    const roi =
      purchase === null || current === null
        ? null
        : calculateROI(current, purchase);

    const grade =
      item.gradingCompany === "RAW" || !item.grade
        ? item.gradingCompany === "RAW"
          ? "Raw"
          : ""
        : `${item.gradingCompany} ${item.grade}`;

    const row = [
      item.card.set.game.name,
      item.card.set.name,
      item.card.name,
      item.card.cardNumber,
      item.variant?.variantName ?? "",
      item.condition.replace(/_/g, " "),
      grade,
      String(item.quantity),
      purchase === null ? "" : purchase.toFixed(2),
      item.purchaseDate ? item.purchaseDate.toISOString().slice(0, 10) : "",
      item.purchaseSource ?? "",
      current === null ? "" : current.toFixed(2),
      profit === null ? "" : profit.toFixed(2),
      roi === null ? "N/A" : roi.toFixed(2),
    ].map((c) => escapeCsvCell(c));

    lines.push(row.join(","));
  }

  return lines.join("\n");
}
