import type { CardIdentifier, SaleMatchCriteria } from "../types/card";
import { normalizeGrade } from "../types/grading";
import { normalizeCardNumber, normalizeLanguage, normalizeText } from "./text";

/**
 * Canonical, comparable form of a card identity (spec §15).
 *
 * Matching compares normalized identities so `Base Set` / `base set` and
 * `4/102` / `004/102` are recognised as the same thing, while genuinely absent
 * fields stay absent.
 */
export interface NormalizedCardIdentifier {
  cardId?: string;
  variantId?: string;
  game?: string;
  cardName?: string;
  setName?: string;
  setCode?: string;
  cardNumber?: string;
  variantName?: string;
  printing?: string;
  language?: string;
}

export function normalizeCardIdentifier(identifier: CardIdentifier): NormalizedCardIdentifier {
  return {
    cardId: identifier.cardId?.trim() || undefined,
    variantId: identifier.variantId?.trim() || undefined,
    game: normalizeText(identifier.game),
    cardName: normalizeText(identifier.cardName),
    setName: normalizeText(identifier.setName),
    setCode: normalizeText(identifier.setCode),
    cardNumber: normalizeCardNumber(identifier.cardNumber),
    variantName: normalizeText(identifier.variantName),
    printing: normalizeText(identifier.printing),
    language: normalizeLanguage(identifier.language),
  };
}

export interface NormalizedSaleMatchCriteria extends NormalizedCardIdentifier {
  condition?: SaleMatchCriteria["condition"];
  gradingCompany?: SaleMatchCriteria["gradingCompany"];
  grade?: string;
}

export function normalizeSaleMatchCriteria(
  criteria: SaleMatchCriteria,
): NormalizedSaleMatchCriteria {
  return {
    ...normalizeCardIdentifier(criteria),
    condition: criteria.condition,
    gradingCompany: criteria.gradingCompany,
    grade: normalizeGrade(criteria.grade),
  };
}
