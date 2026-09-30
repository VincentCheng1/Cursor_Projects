import type { TcgCsvPrice, TcgCsvProduct, TcgCsvReferencePrice } from "./types";

/** Minimal RFC4180-ish CSV parse for TCGCSV fixture / file snippets. */
export function parseTcgCsvText(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0]!.map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i]!;
    if (cells.length === 1 && cells[0]?.trim() === "") continue;
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]!] = (cells[c] ?? "").trim();
    }
    out.push(row);
  }
  return out;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch === "\r") continue;
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function optionalNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function normalizeTcgCsvPriceRow(
  row: Partial<TcgCsvPrice> | Record<string, string>,
): TcgCsvReferencePrice | null {
  const productIdRaw =
    typeof row.productId === "number"
      ? row.productId
      : Number((row as Record<string, string>).productId);
  if (!Number.isFinite(productIdRaw)) return null;

  const subType =
    typeof row.subTypeName === "string" && row.subTypeName.trim() !== ""
      ? row.subTypeName.trim()
      : "Normal";

  const market =
    typeof row.marketPrice === "number"
      ? row.marketPrice
      : optionalNumber((row as Record<string, string>).marketPrice);
  const mid =
    typeof row.midPrice === "number"
      ? row.midPrice
      : optionalNumber((row as Record<string, string>).midPrice);
  const low =
    typeof row.lowPrice === "number"
      ? row.lowPrice
      : optionalNumber((row as Record<string, string>).lowPrice);
  const high =
    typeof row.highPrice === "number"
      ? row.highPrice
      : optionalNumber((row as Record<string, string>).highPrice);

  // Fail closed: skip rows with no usable market/mid signal.
  if (market === null && mid === null) return null;

  return {
    productId: String(productIdRaw),
    subTypeName: subType,
    marketPrice: market,
    midPrice: mid,
    lowPrice: low,
    highPrice: high,
  };
}

export function parseTcgCsvPricesCsv(text: string): TcgCsvReferencePrice[] {
  return parseTcgCsvText(text)
    .map((row) => normalizeTcgCsvPriceRow(row))
    .filter((r): r is TcgCsvReferencePrice => r !== null);
}

export function pickExtendedField(
  product: TcgCsvProduct,
  names: string[],
): string | null {
  const wanted = names.map((n) => n.toLowerCase());
  for (const item of product.extendedData ?? []) {
    const key = (item.name ?? item.displayName ?? "").toLowerCase();
    if (wanted.includes(key) && item.value !== undefined && item.value.trim() !== "") {
      return item.value.trim();
    }
  }
  return null;
}

/** Prefer marketPrice, else midPrice — reference only (§2). */
export function pickReferenceUnitPrice(price: TcgCsvReferencePrice): number | null {
  if (price.marketPrice !== null && Number.isFinite(price.marketPrice)) {
    return price.marketPrice;
  }
  if (price.midPrice !== null && Number.isFinite(price.midPrice)) {
    return price.midPrice;
  }
  return null;
}

export function mapSubTypeToVariantHints(subTypeName: string): {
  variantName: string;
  printing: string | null;
  isFoil: boolean;
  isParallel: boolean;
} {
  const name = subTypeName.trim() || "Normal";
  const foil = /foil|holo/i.test(name);
  return {
    variantName: name === "Normal" ? "Default" : name,
    printing: name === "Normal" ? null : name,
    isFoil: foil,
    isParallel: /parallel/i.test(name),
  };
}
