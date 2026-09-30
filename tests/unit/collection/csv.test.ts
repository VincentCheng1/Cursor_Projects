import { describe, expect, it } from "vitest";

import { COLLECTION_CSV_COLUMNS } from "@/lib/collection/csv-columns";
import { assertCsvHeaders, escapeCsvCell, parseCsv } from "@/lib/collection/csv-parse";

describe("collection CSV", () => {
  it("parses quoted commas", () => {
    const { headers, rows } = parseCsv('Game,Set\n"Pokémon","Base, Set"');
    expect(headers).toEqual(["Game", "Set"]);
    expect(rows[0]).toEqual(["Pokémon", "Base, Set"]);
  });

  it("escapes cells with quotes", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("validates §36 header prefix", () => {
    expect(assertCsvHeaders([...COLLECTION_CSV_COLUMNS])).toBeNull();
    expect(assertCsvHeaders(["Wrong"])).toContain("Expected header");
  });
});
