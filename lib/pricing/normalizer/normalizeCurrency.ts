import type { CurrencyCode } from "../types/currency";
import { isCurrencyCode } from "../types/currency";

/**
 * Maps a marketplace currency label onto a supported ISO code (spec §20).
 *
 * A bare `$` is ambiguous between USD, CAD and AUD, so it resolves to
 * `undefined` and the sale is excluded rather than silently averaged as USD.
 */
const CURRENCY_ALIASES: Record<string, CurrencyCode> = {
  "us $": "USD",
  "us$": "USD",
  usd: "USD",
  "united states dollar": "USD",
  "c $": "CAD",
  "c$": "CAD",
  cad: "CAD",
  "canadian dollar": "CAD",
  eur: "EUR",
  "€": "EUR",
  euro: "EUR",
  gbp: "GBP",
  "£": "GBP",
  "british pound": "GBP",
  jpy: "JPY",
  "¥": "JPY",
  "japanese yen": "JPY",
  aud: "AUD",
  "au $": "AUD",
  "au$": "AUD",
  "australian dollar": "AUD",
};

export function normalizeCurrency(value: string | null | undefined): CurrencyCode | undefined {
  if (value === null || value === undefined) return undefined;

  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  const upper = trimmed.toUpperCase();
  if (isCurrencyCode(upper)) return upper;

  return CURRENCY_ALIASES[trimmed.toLowerCase()];
}
