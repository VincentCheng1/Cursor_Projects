import { COLLECTION_CSV_COLUMNS, COLLECTION_CSV_IMPORT_COLUMNS } from "./csv-columns";

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  if (nonEmpty.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(nonEmpty[0]!);
  const rows = nonEmpty.slice(1).map(parseCsvLine);
  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

export function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function assertCsvHeaders(headers: string[]): string | null {
  if (headers.length < COLLECTION_CSV_IMPORT_COLUMNS.length) {
    return `Expected header row with at least: ${COLLECTION_CSV_IMPORT_COLUMNS.join(", ")}`;
  }
  for (let i = 0; i < COLLECTION_CSV_IMPORT_COLUMNS.length; i += 1) {
    const want = COLLECTION_CSV_IMPORT_COLUMNS[i];
    const got = headers[i]?.trim();
    if (got !== want) {
      return `Column ${i + 1} should be "${want}", got "${got ?? ""}"`;
    }
  }
  return null;
}
