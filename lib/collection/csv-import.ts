import type { Condition, GradingCompany } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";
import { z } from "zod";

import { COLLECTION_CSV_IMPORT_COLUMNS } from "./csv-columns";
import { assertCsvHeaders, parseCsv } from "./csv-parse";
import { createCollectionItemSchema } from "./schemas";

const conditionSchema = z.enum([
  "DAMAGED",
  "HEAVILY_PLAYED",
  "MODERATELY_PLAYED",
  "LIGHTLY_PLAYED",
  "NEAR_MINT",
]);

const gradingSchema = z.enum(["RAW", "PSA", "CGC", "BGS", "SGC", "OTHER"]);

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ValidatedImportRow {
  row: number;
  data: z.infer<typeof createCollectionItemSchema>;
}

function normalizeCondition(raw: string): Condition | null {
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  const parsed = conditionSchema.safeParse(key);
  if (parsed.success) return parsed.data;
  const aliases: Record<string, Condition> = {
    NM: "NEAR_MINT",
    LP: "LIGHTLY_PLAYED",
    MP: "MODERATELY_PLAYED",
    HP: "HEAVILY_PLAYED",
  };
  return aliases[key] ?? null;
}

function parseGrade(raw: string): { gradingCompany: GradingCompany; grade: string | null } {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "raw") {
    return { gradingCompany: "RAW", grade: null };
  }
  const parts = trimmed.split(/\s+/);
  const company = parts[0]?.toUpperCase();
  const parsed = gradingSchema.safeParse(company);
  if (!parsed.success || parsed.data === "RAW") {
    return { gradingCompany: "RAW", grade: trimmed };
  }
  return { gradingCompany: parsed.data, grade: parts.slice(1).join(" ") || null };
}

export async function validateCollectionCsv(csvText: string): Promise<{
  valid: ValidatedImportRow[];
  errors: ImportRowError[];
}> {
  const { headers, rows } = parseCsv(csvText);
  const headerError = assertCsvHeaders(headers);
  if (headerError !== null) {
    return { valid: [], errors: [{ row: 1, message: headerError }] };
  }

  const valid: ValidatedImportRow[] = [];
  const errors: ImportRowError[] = [];
  const prisma = getPrisma();

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const cells = rows[i] ?? [];
    if (cells.every((c) => c.trim() === "")) continue;

    const record: Record<string, string> = {};
    COLLECTION_CSV_IMPORT_COLUMNS.forEach((col, idx) => {
      record[col] = cells[idx]?.trim() ?? "";
    });

    const condition = normalizeCondition(record["Condition"] ?? "");
    if (condition === null) {
      errors.push({ row: rowNum, message: `Invalid condition: ${record["Condition"]}` });
      continue;
    }

    const { gradingCompany, grade } = parseGrade(record["Grade"] ?? "");

    const game = await prisma.game.findFirst({
      where: {
        OR: [
          { name: { equals: record["Game"] ?? "", mode: "insensitive" } },
          {
            slug: {
              equals: (record["Game"] ?? "").toLowerCase().replace(/\s+/g, "-"),
              mode: "insensitive",
            },
          },
        ],
      },
    });
    if (game === null) {
      errors.push({ row: rowNum, message: `Unknown game: ${record.Game}` });
      continue;
    }

    const set = await prisma.cardSet.findFirst({
      where: {
        gameId: game.id,
        name: { equals: record["Set"] ?? "", mode: "insensitive" },
      },
    });
    if (set === null) {
      errors.push({
        row: rowNum,
        message: `Unknown set "${record["Set"]}" for game ${record["Game"]}`,
      });
      continue;
    }

    const card = await prisma.card.findFirst({
      where: {
        setId: set.id,
        name: { equals: record["Card Name"], mode: "insensitive" },
        cardNumber: { equals: record["Card Number"], mode: "insensitive" },
      },
      include: { variants: true },
    });
    if (card === null) {
      errors.push({
        row: rowNum,
        message: `Card not found: ${record["Card Name"]} ${record["Card Number"]}`,
      });
      continue;
    }

    let variantId: string | null = null;
    const variantName = record["Variant"] ?? "";
    if (variantName !== "") {
      const variant = card.variants.find(
        (v) => v.variantName.toLowerCase() === variantName.toLowerCase(),
      );
      if (variant === undefined) {
        errors.push({ row: rowNum, message: `Unknown variant: ${variantName}` });
        continue;
      }
      variantId = variant.id;
    }

    const quantity = Number(record["Quantity"] ?? "1");
    const purchasePriceRaw = record["Purchase Price"] ?? "";
    const purchasePrice = purchasePriceRaw === "" ? null : Number(purchasePriceRaw);
    const purchaseDateRaw = record["Purchase Date"] ?? "";
    let purchaseDate: Date | null = null;
    if (purchaseDateRaw !== "") {
      purchaseDate = new Date(purchaseDateRaw);
    }

    const parsed = createCollectionItemSchema.safeParse({
      cardId: card.id,
      variantId,
      condition,
      gradingCompany,
      grade,
      quantity: Number.isFinite(quantity) ? quantity : 1,
      purchasePrice: purchasePrice !== null && Number.isFinite(purchasePrice) ? purchasePrice : null,
      purchaseDate:
        purchaseDate !== null && !Number.isNaN(purchaseDate.getTime()) ? purchaseDate : null,
      purchaseSource: record["Purchase Source"] || null,
    });

    if (!parsed.success) {
      errors.push({
        row: rowNum,
        message: parsed.error.issues.map((x) => x.message).join("; "),
      });
      continue;
    }

    valid.push({ row: rowNum, data: parsed.data });
  }

  return { valid, errors };
}

export async function commitCollectionImport(
  userId: string,
  rows: ValidatedImportRow[],
): Promise<number> {
  let created = 0;
  for (const row of rows) {
    await getPrisma().collectionItem.create({
      data: {
        userId,
        cardId: row.data.cardId,
        variantId: row.data.variantId ?? null,
        condition: row.data.condition,
        gradingCompany: row.data.gradingCompany,
        grade: row.data.grade ?? null,
        quantity: row.data.quantity,
        purchasePrice: row.data.purchasePrice ?? null,
        purchaseDate: row.data.purchaseDate ?? null,
        purchaseSource: row.data.purchaseSource ?? null,
        notes: row.data.notes ?? null,
      },
    });
    created += 1;
  }
  return created;
}
