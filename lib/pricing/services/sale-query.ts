import type { Condition, GradingCompany, Prisma } from "@/lib/db/generated/client";

import { isCondition } from "../types/condition";
import { isGradingCompany, normalizeGrade } from "../types/grading";
import type { SalesQueryOptions } from "../types/provider";
import type { Sale } from "../types/sale";
import type { PricingIdentity } from "./match-criteria";

/**
 * How many DB rows to load after identity filters.
 * Filters run in SQL first so this window is already condition/grade-scoped
 * (spec §3 / §18 — filter before limit).
 */
export const DB_SALE_FETCH_LIMIT = 200;

/**
 * How many *qualifying* provider sales to keep after options filters.
 * Providers may oversample/paginate to fill this without starving comps.
 */
export const PROVIDER_QUALIFYING_LIMIT = 100;

/** Max Finding API pages when oversampling for a condition/grade slice. */
export const EBAY_MAX_FETCH_PAGES = 5;

export function buildDbSaleWhere(
  identity: PricingIdentity,
): Prisma.SaleWhereInput {
  const clauses: Prisma.SaleWhereInput[] = [
    { cardId: identity.card.id },
    { condition: identity.condition },
  ];

  if (identity.variant?.id !== undefined) {
    clauses.push({ variantId: identity.variant.id });
  }

  if (identity.gradingCompany === "RAW") {
    // Engine treats missing grading as RAW; keep null rows in the fetch window.
    clauses.push({
      OR: [{ gradingCompany: "RAW" }, { gradingCompany: null }],
    });
  } else {
    clauses.push({ gradingCompany: identity.gradingCompany });
  }

  if (identity.grade !== null && identity.grade !== undefined && identity.grade !== "") {
    clauses.push({ grade: identity.grade });
  } else if (identity.gradingCompany === "RAW") {
    clauses.push({ OR: [{ grade: null }, { grade: "" }] });
  }

  return { AND: clauses };
}

/**
 * Apply provider sales-query options *before* truncating to `limit`.
 * Spec §3 / §18: never take the newest N mixed rows and hope enough qualify.
 */
export function filterSalesByQueryOptions(
  sales: Sale[],
  options: SalesQueryOptions,
): Sale[] {
  const wantCondition = normalizeQueryCondition(options.condition);
  const wantGrading = normalizeQueryGrading(options.gradingCompany);
  const wantGrade =
    options.grade !== undefined && options.grade !== ""
      ? normalizeGrade(options.grade)
      : undefined;
  const wantLanguage =
    options.language !== undefined && options.language !== ""
      ? options.language.trim().toUpperCase()
      : undefined;

  return sales.filter((sale) => {
    if (wantCondition !== undefined) {
      if (sale.condition === undefined) return false;
      if (sale.condition !== wantCondition) return false;
    }
    if (wantGrading !== undefined) {
      if (sale.gradingCompany === undefined) {
        if (wantGrading !== "RAW") return false;
      } else if (sale.gradingCompany !== wantGrading) {
        return false;
      }
    }
    if (wantGrade !== undefined) {
      const saleGrade = normalizeGrade(sale.grade);
      if (saleGrade === undefined || saleGrade !== wantGrade) return false;
    }
    if (wantLanguage !== undefined) {
      const saleLang = sale.language?.trim().toUpperCase();
      if (saleLang === undefined || saleLang !== wantLanguage) return false;
    }
    return true;
  });
}

export function takeRecentSales(sales: Sale[], limit: number): Sale[] {
  if (limit <= 0) return [];
  return [...sales]
    .sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime())
    .slice(0, limit);
}

function normalizeQueryCondition(
  value: string | undefined,
): Condition | undefined {
  if (value === undefined || value === "") return undefined;
  if (isCondition(value)) return value;
  return undefined;
}

function normalizeQueryGrading(
  value: string | undefined,
): GradingCompany | undefined {
  if (value === undefined || value === "") return undefined;
  if (isGradingCompany(value)) return value;
  return undefined;
}
