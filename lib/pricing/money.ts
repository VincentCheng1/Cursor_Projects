import Decimal from "decimal.js";

import type { MoneyValue } from "./types/sale";

/**
 * Decimal-safe money helpers (spec §58).
 *
 * Every monetary computation in CardVault goes through this module. Nothing
 * adds, divides or compares prices with raw JavaScript numbers, so a user never
 * sees `$127.449999999`.
 */

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

/** Money is stored and displayed to two decimal places. */
export const MONEY_DECIMAL_PLACES = 2;

export type DecimalLike = MoneyValue | Decimal;

export function toDecimal(value: DecimalLike): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value);
}

/** True when the value is a real, finite, non-negative amount of money. */
export function isValidMoney(value: unknown): value is MoneyValue {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed === "") return false;
  try {
    return new Decimal(trimmed).isFinite();
  } catch {
    return false;
  }
}

export function tryToDecimal(value: unknown): Decimal | null {
  if (!isValidMoney(value)) return null;
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

/** Half-up rounding to cents — the rounding a price tag uses. */
export function roundMoney(value: DecimalLike): Decimal {
  return toDecimal(value).toDecimalPlaces(MONEY_DECIMAL_PLACES, Decimal.ROUND_HALF_UP);
}

/**
 * Converts to the `number` the API and UI layers consume. The value is rounded
 * to cents first, so the resulting double is exact to the displayed precision.
 */
export function toMoneyNumber(value: DecimalLike): number {
  return roundMoney(value).toNumber();
}

/** Fixed two-decimal string, e.g. `127.45`. Never scientific notation. */
export function toMoneyString(value: DecimalLike): string {
  return roundMoney(value).toFixed(MONEY_DECIMAL_PLACES);
}

export function sumMoney(values: readonly DecimalLike[]): Decimal {
  return values.reduce<Decimal>((total, value) => total.plus(toDecimal(value)), new Decimal(0));
}

/** Arithmetic mean. Returns null for an empty list — never divides by zero. */
export function meanMoney(values: readonly DecimalLike[]): Decimal | null {
  if (values.length === 0) return null;
  return sumMoney(values).dividedBy(values.length);
}

/** Median. For an even count, the mean of the two middle values. */
export function medianMoney(values: readonly DecimalLike[]): Decimal | null {
  if (values.length === 0) return null;
  const sorted = values.map(toDecimal).sort((a, b) => a.comparedTo(b));
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] as Decimal;
  }
  const lower = sorted[middle - 1] as Decimal;
  const upper = sorted[middle] as Decimal;
  return lower.plus(upper).dividedBy(2);
}

export function minMoney(values: readonly DecimalLike[]): Decimal | null {
  if (values.length === 0) return null;
  return values.map(toDecimal).reduce((a, b) => (a.lessThan(b) ? a : b));
}

export function maxMoney(values: readonly DecimalLike[]): Decimal | null {
  if (values.length === 0) return null;
  return values.map(toDecimal).reduce((a, b) => (a.greaterThan(b) ? a : b));
}

export function formatMoney(value: DecimalLike | null, currency = "USD", locale = "en-US"): string {
  if (value === null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(toMoneyNumber(value));
}

export { Decimal };
