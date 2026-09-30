/**
 * Multi-card lot detection (spec §16).
 *
 * A qualifying sale represents exactly one copy of the card. A listing whose
 * price covers several cards is excluded outright — never divided down, because
 * dividing assumes the copies were priced evenly and that the listing contained
 * nothing else, neither of which is knowable from the listing.
 *
 * Detection only ever *adds* exclusions. Returning `false` means "no lot signal
 * was found", not "proven single copy"; sources that can prove single-copy
 * pricing say so with `copiesCovered`.
 */

const LOT_PATTERNS: readonly RegExp[] = [
  /\blots?\s+of\b/i,
  /\blot\b/i,
  /\bbundles?\b/i,
  /\bplayset\b/i,
  /\bplay\s?set\b/i,
  /\bcomplete\s+set\b/i,
  /\bmaster\s+set\b/i,
  /\bfull\s+set\b/i,
  /\bbulk\b/i,
  /\bcollection\s+of\b/i,
  /\bjoblot\b/i,
  /\bjob\s+lot\b/i,
  // "x3", "x 3", "3x", "3 x" immediately around a small count.
  /\bx\s?([2-9]|\d{2,})\b/i,
  /\b([2-9]|\d{2,})\s?x\b/i,
  // "set of 4", "3 cards", "4 copies", "pair of"
  /\bset\s+of\s+\d+/i,
  /\b\d+\s+cards?\b/i,
  /\b\d+\s+copies\b/i,
  /\bpair\s+of\b/i,
];

export function detectMultiCardLot(listingTitle: string | null | undefined): boolean {
  if (listingTitle === null || listingTitle === undefined) return false;
  const title = listingTitle.trim();
  if (title === "") return false;

  return LOT_PATTERNS.some((pattern) => pattern.test(title));
}

/**
 * True when the sale provably covers more than one copy, or looks like a lot.
 * Used by the qualifying filter; sales with no signal either way are left alone.
 */
export function isMultiCardLot(sale: {
  copiesCovered?: number;
  isLot?: boolean;
  listingTitle?: string;
}): boolean {
  if (sale.isLot === true) return true;
  if (sale.copiesCovered !== undefined && sale.copiesCovered > 1) return true;
  return detectMultiCardLot(sale.listingTitle);
}
