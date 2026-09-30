/** Exact §36 column order for export; import accepts this header row. */
export const COLLECTION_CSV_COLUMNS = [
  "Game",
  "Set",
  "Card Name",
  "Card Number",
  "Variant",
  "Condition",
  "Grade",
  "Quantity",
  "Purchase Price",
  "Purchase Date",
  "Purchase Source",
  "Current Value",
  "Profit",
  "ROI",
] as const;

export type CollectionCsvColumn = (typeof COLLECTION_CSV_COLUMNS)[number];

/** Columns written on import (computed export columns are ignored). */
export const COLLECTION_CSV_IMPORT_COLUMNS = [
  "Game",
  "Set",
  "Card Name",
  "Card Number",
  "Variant",
  "Condition",
  "Grade",
  "Quantity",
  "Purchase Price",
  "Purchase Date",
  "Purchase Source",
] as const;
