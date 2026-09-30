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
 * Identity context safe to stamp onto an eBay sale.
 *
 * When evidence confirms the requested card, return the full CardVault context
 * (including `cardId`). Otherwise return an empty identity so matching excludes
 * the row and persistence cannot forge a foreign key (spec §5, §16).
 */
export function ebayIdentityFromListing(
  evidence: ListingEvidence,
  requested: CardIdentifier,
): CardIdentifier {
  if (listingConfirmsCardIdentity(evidence, requested)) {
    return requested;
  }
  return {};
}
