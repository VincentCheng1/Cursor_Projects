import { normalizeGrade } from "../types/grading";
import {
  normalizeCardIdentifier,
  normalizeSaleMatchCriteria,
} from "../normalizer/normalizeCardIdentifier";
import { isMultiCardLot } from "../normalizer/detectLot";
import { normalizeCurrency } from "../normalizer/normalizeCurrency";
import type { ExclusionReason } from "../types/calculation";
import type { SaleMatchCriteria } from "../types/card";
import type { CurrencyCode } from "../types/currency";
import type { Sale } from "../types/sale";

function fieldMismatch(
  saleValue: string | undefined,
  criteriaValue: string | undefined,
  reason: ExclusionReason,
): ExclusionReason | null {
  if (criteriaValue === undefined) return null;
  if (saleValue === undefined) return "UNKNOWN_CARD";
  if (saleValue !== criteriaValue) return reason;
  return null;
}

/**
 * Conservative sale-to-criteria comparison (spec §16).
 *
 * Every criterion field that is set must match; missing sale identity when a
 * criterion is set means the sale cannot be confidently attributed.
 */
export function matchSaleReason(
  sale: Sale,
  criteria: SaleMatchCriteria,
  targetCurrency: CurrencyCode,
): ExclusionReason | null {
  if (isMultiCardLot(sale)) {
    return "MULTI_CARD_LOT";
  }

  const saleCurrency = normalizeCurrency(sale.currency);
  if (saleCurrency === undefined) return "UNKNOWN_CURRENCY";
  if (saleCurrency !== targetCurrency) return "CURRENCY_MISMATCH";

  const saleId = normalizeCardIdentifier({
    cardId: sale.cardId,
    variantId: sale.variantId,
    game: sale.game,
    cardName: sale.cardName,
    setName: sale.setName,
    setCode: sale.setCode,
    cardNumber: sale.cardNumber,
    variantName: sale.variantName,
    printing: sale.printing,
    language: sale.language,
  });

  const want = normalizeSaleMatchCriteria(criteria);

  const checks: Array<ExclusionReason | null> = [
    fieldMismatch(saleId.cardId, want.cardId, "CARD_MISMATCH"),
    fieldMismatch(saleId.variantId, want.variantId, "VARIANT_MISMATCH"),
    fieldMismatch(saleId.game, want.game, "GAME_MISMATCH"),
    fieldMismatch(saleId.cardName, want.cardName, "CARD_MISMATCH"),
    fieldMismatch(saleId.setName, want.setName, "SET_MISMATCH"),
    fieldMismatch(saleId.setCode, want.setCode, "SET_MISMATCH"),
    fieldMismatch(saleId.cardNumber, want.cardNumber, "CARD_NUMBER_MISMATCH"),
    fieldMismatch(saleId.variantName, want.variantName, "VARIANT_MISMATCH"),
    fieldMismatch(saleId.printing, want.printing, "PRINTING_MISMATCH"),
    fieldMismatch(saleId.language, want.language, "LANGUAGE_MISMATCH"),
  ];

  for (const hit of checks) {
    if (hit !== null) return hit;
  }

  if (want.condition !== undefined) {
    if (sale.condition === undefined) return "UNKNOWN_CONDITION";
    if (sale.condition !== want.condition) return "CONDITION_MISMATCH";
  }

  if (want.gradingCompany !== undefined) {
    if (sale.gradingCompany === undefined) return "UNKNOWN_GRADING";
    if (sale.gradingCompany !== want.gradingCompany) return "GRADING_MISMATCH";
  }

  if (want.grade !== undefined) {
    const saleGrade = normalizeGrade(sale.grade);
    if (saleGrade === undefined) return "GRADE_MISMATCH";
    if (saleGrade !== want.grade) return "GRADE_MISMATCH";
  }

  return null;
}

export function saleMatchesCriteria(
  sale: Sale,
  criteria: SaleMatchCriteria,
  targetCurrency: CurrencyCode,
): boolean {
  return matchSaleReason(sale, criteria, targetCurrency) === null;
}
