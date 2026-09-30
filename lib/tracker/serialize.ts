import { TRACKER_LINE_COLORS } from "./constants";
import type { listTrackerSeries } from "./service";

type Row = Awaited<ReturnType<typeof listTrackerSeries>>[number];

function releaseYear(date: Date | null | undefined): number | null {
  if (!date) return null;
  return date.getUTCFullYear();
}

export function serializeTrackerSeries(row: Row) {
  const setType = row.card.set.setType;
  const isFoil = row.variant?.isFoil ?? false;
  const year = releaseYear(row.card.set.releaseDate);
  const foil = isFoil ? "Foil" : "Non-Foil";
  const typeLabel = setType === "MAIN" ? "Main" : setType === "PROMO" ? "Promo" : "Other";
  const label = `${row.card.name} · ${row.card.set.name} · ${row.card.cardNumber} · ${foil} · ${year ?? "—"} · ${typeLabel}`;

  return {
    id: row.id,
    cardId: row.cardId,
    variantId: row.variantId,
    sortOrder: row.sortOrder,
    colorIndex: row.colorIndex,
    color: TRACKER_LINE_COLORS[row.colorIndex % TRACKER_LINE_COLORS.length],
    isVisible: row.isVisible,
    label,
    cardName: row.card.name,
    setName: row.card.set.name,
    cardNumber: row.card.cardNumber,
    setType,
    isFoil,
    releaseYear: year,
  };
}
