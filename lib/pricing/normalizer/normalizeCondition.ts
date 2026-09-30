import type { Condition } from "../types/condition";
import { isCondition } from "../types/condition";
import { normalizeText } from "./text";

/**
 * Maps a marketplace's condition label onto CardVault's enum (spec §9, §15).
 *
 * Deliberately conservative: anything that cannot be mapped with confidence —
 * eBay's "Used", a bare "Played", a graded-slab label — returns `undefined` so the
 * sale is excluded from a condition-specific average instead of being lumped in
 * with a condition it may not be.
 */
const CONDITION_ALIASES: Record<string, Condition> = {
  "near mint": "NEAR_MINT",
  "near mint / lightly played": "NEAR_MINT",
  nearmint: "NEAR_MINT",
  nm: "NEAR_MINT",
  "nm-mt": "NEAR_MINT",
  "near mint (nm)": "NEAR_MINT",
  // eBay Finding / Trading Card conditionDisplayName values
  new: "NEAR_MINT",
  "brand new": "NEAR_MINT",
  "like new": "NEAR_MINT",
  mint: "NEAR_MINT",
  "new (other)": "NEAR_MINT",
  "new other": "NEAR_MINT",

  "lightly played": "LIGHTLY_PLAYED",
  "light play": "LIGHTLY_PLAYED",
  lightlyplayed: "LIGHTLY_PLAYED",
  lp: "LIGHTLY_PLAYED",
  excellent: "LIGHTLY_PLAYED",

  "moderately played": "MODERATELY_PLAYED",
  "moderate play": "MODERATELY_PLAYED",
  moderatelyplayed: "MODERATELY_PLAYED",
  mp: "MODERATELY_PLAYED",
  "very good": "MODERATELY_PLAYED",

  "heavily played": "HEAVILY_PLAYED",
  "heavy play": "HEAVILY_PLAYED",
  heavilyplayed: "HEAVILY_PLAYED",
  hp: "HEAVILY_PLAYED",
  poor: "HEAVILY_PLAYED",
  good: "HEAVILY_PLAYED",
  acceptable: "HEAVILY_PLAYED",

  damaged: "DAMAGED",
  dmg: "DAMAGED",
  "damaged (dmg)": "DAMAGED",
};

export function normalizeCondition(value: string | null | undefined): Condition | undefined {
  if (isCondition(value)) return value;

  const key = normalizeText(value);
  if (key === undefined) return undefined;

  const enumStyle = key.replace(/[\s-]+/g, "_").toUpperCase();
  if (isCondition(enumStyle)) return enumStyle;

  return CONDITION_ALIASES[key];
}
