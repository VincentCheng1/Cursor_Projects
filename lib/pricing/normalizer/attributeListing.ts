import type { CardIdentifier } from "../types/card";
import { normalizeCardNumber, normalizeText } from "./text";

/**
 * Conservative listing → card attribution (spec §16).
 *
 * Keyword search (eBay Finding) returns loosely related titles. CardVault must
 * never stamp the *requested* card identity onto a sale unless listing evidence
 * confirms it. When confirmation fails, identity fields stay unset and the
 * calculator excludes the row.
 */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when `phrase` appears in `haystack` as whole words (normalized). */
export function containsPhrase(haystack: string, phrase: string): boolean {
  const pattern = escapeRegex(phrase).replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?:[^a-z0-9]|$)`, "i").test(haystack);
}

function titleContainsCardNumber(title: string, expected: string): boolean {
  if (containsPhrase(title, expected)) return true;

  const slashForms = title.match(/\d+\s*\/\s*\d+/g) ?? [];
  if (slashForms.some((token) => normalizeCardNumber(token) === expected)) {
    return true;
  }

  const hashForms = title.match(/#\s*[\w.-]+/g) ?? [];
  return hashForms.some((token) => normalizeCardNumber(token) === expected);
}

export type ListingEvidence = {
  title?: string | null;
};

export type AttributionFields = Pick<
  CardIdentifier,
  "cardName" | "setName" | "setCode" | "cardNumber"
>;

export type VariantAttributionFields = Pick<
  CardIdentifier,
  "variantName" | "printing"
>;

/**
 * Whether listing evidence confidently belongs to the expected card.
 *
 * Requires the card name as a whole-word phrase, plus at least one of set name,
 * set code, or card number when those are known. Name alone is never enough —
 * many printings share a name.
 */
export function listingConfirmsCardIdentity(
  evidence: ListingEvidence | string | null | undefined,
  expected: AttributionFields,
): boolean {
  const title =
    typeof evidence === "string" || evidence === null || evidence === undefined
      ? normalizeText(evidence)
      : normalizeText(evidence.title);
  if (title === undefined) return false;

  const cardName = normalizeText(expected.cardName);
  if (cardName === undefined) return false;
  if (!containsPhrase(title, cardName)) return false;

  const cardNumber = normalizeCardNumber(expected.cardNumber);
  const setName = normalizeText(expected.setName);
  const setCode = normalizeText(expected.setCode);

  const hasSecondarySignal =
    cardNumber !== undefined || setName !== undefined || setCode !== undefined;
  if (!hasSecondarySignal) {
    // Without set/number on the expected card we cannot disambiguate printings.
    return false;
  }

  const numberOk =
    cardNumber !== undefined && titleContainsCardNumber(title, cardNumber);
  const setOk =
    (setName !== undefined && containsPhrase(title, setName)) ||
    (setCode !== undefined && containsPhrase(title, setCode));

  return numberOk || setOk;
}

/**
 * Whether listing evidence supports the requested variant / printing slice.
 *
 * Every requested variantName and printing must appear as phrases in the title.
 * If the request names a variant/printing and the title is silent, refuse —
 * do not stamp the request onto the sale (spec §16).
 */
export function listingConfirmsVariantIdentity(
  evidence: ListingEvidence | string | null | undefined,
  expected: VariantAttributionFields,
): boolean {
  const title =
    typeof evidence === "string" || evidence === null || evidence === undefined
      ? normalizeText(evidence)
      : normalizeText(evidence.title);
  if (title === undefined) return false;

  const variantName = normalizeText(expected.variantName);
  const printing = normalizeText(expected.printing);

  // Nothing variant-specific to prove → nothing to confirm.
  if (variantName === undefined && printing === undefined) return true;

  if (variantName !== undefined && !containsPhrase(title, variantName)) {
    return false;
  }
  if (printing !== undefined && !containsPhrase(title, printing)) {
    return false;
  }
  return true;
}

/**
 * Identity context safe to stamp onto an eBay sale.
 *
 * Card-level fields (`cardId`, name, set, number) require listing confirmation.
 * Variant / printing / variantId are stamped only when the title also evidences
 * those phrases. Otherwise card-level identity may still be returned without
 * variant fields so §16 matching excludes the row from a variant-scoped average
 * instead of silently accepting a forged printing.
 */
export function ebayIdentityFromListing(
  evidence: ListingEvidence,
  requested: CardIdentifier,
): CardIdentifier {
  if (!listingConfirmsCardIdentity(evidence, requested)) {
    return {};
  }

  const cardLevel: CardIdentifier = {
    cardId: requested.cardId,
    game: requested.game,
    cardName: requested.cardName,
    setName: requested.setName,
    setCode: requested.setCode,
    cardNumber: requested.cardNumber,
    language: requested.language,
  };

  const wantsVariant =
    normalizeText(requested.variantName) !== undefined ||
    normalizeText(requested.printing) !== undefined ||
    (requested.variantId !== undefined && requested.variantId.trim() !== "");

  if (!wantsVariant) {
    return cardLevel;
  }

  if (!listingConfirmsVariantIdentity(evidence, requested)) {
    // Card confirmed, variant not — refuse to stamp the requested printing.
    return cardLevel;
  }

  return {
    ...cardLevel,
    variantId: requested.variantId,
    variantName: requested.variantName,
    printing: requested.printing,
  };
}
