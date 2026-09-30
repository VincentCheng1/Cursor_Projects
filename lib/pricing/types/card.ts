import type { Condition } from "./condition";
import type { GradingCompany } from "./grading";

/**
 * Identifies one exact printing of one card.
 *
 * Every field that is present becomes a matching requirement (spec §16): a sale
 * that does not positively satisfy it is excluded.
 */
export interface CardIdentifier {
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

/**
 * A card identity plus the physical state being priced. This is the full set of
 * attributes spec §16 requires a sale to agree on before it can be averaged.
 */
export interface SaleMatchCriteria extends CardIdentifier {
  condition?: Condition;
  gradingCompany?: GradingCompany;
  grade?: string;
}
