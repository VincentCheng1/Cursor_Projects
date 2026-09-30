/**
 * Normalized card conditions.
 *
 * Conditions are never merged or approximated (spec §9). When a source reports a
 * condition CardVault cannot map with confidence, the value stays `undefined` and
 * the sale is excluded from a condition-specific calculation rather than guessed at.
 */
export const CONDITIONS = [
  "DAMAGED",
  "HEAVILY_PLAYED",
  "MODERATELY_PLAYED",
  "LIGHTLY_PLAYED",
  "NEAR_MINT",
] as const;

export type Condition = (typeof CONDITIONS)[number];

/** Worst to best, for sorting and range display. Not for merging conditions. */
export const CONDITION_ORDER: Record<Condition, number> = {
  DAMAGED: 0,
  HEAVILY_PLAYED: 1,
  MODERATELY_PLAYED: 2,
  LIGHTLY_PLAYED: 3,
  NEAR_MINT: 4,
};

export const CONDITION_LABELS: Record<Condition, string> = {
  DAMAGED: "Damaged",
  HEAVILY_PLAYED: "Heavily Played",
  MODERATELY_PLAYED: "Moderately Played",
  LIGHTLY_PLAYED: "Lightly Played",
  NEAR_MINT: "Near Mint",
};

export function isCondition(value: unknown): value is Condition {
  return typeof value === "string" && (CONDITIONS as readonly string[]).includes(value);
}
