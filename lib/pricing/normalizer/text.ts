/** Shared, deliberately boring string normalization used by matching and deduplication. */

export function normalizeText(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const collapsed = value.trim().replace(/\s+/g, " ").toLowerCase();
  return collapsed === "" ? undefined : collapsed;
}

/**
 * Card numbers appear as `4/102`, `004/102`, `OP01-001`, `#4`. Normalization strips
 * decoration and leading zeros on each segment so equal numbers compare equal —
 * but it never tries to guess a number that is absent.
 */
export function normalizeCardNumber(value: string | null | undefined): string | undefined {
  const base = normalizeText(value);
  if (base === undefined) return undefined;

  const cleaned = base.replace(/[#\s]/g, "");
  if (cleaned === "") return undefined;

  return cleaned
    .split("/")
    .map((segment) =>
      segment.replace(/^(\D*?)0+(\d)/, "$1$2"),
    )
    .join("/");
}

/** Language codes and names collapse to an uppercase ISO-ish code. */
export function normalizeLanguage(value: string | null | undefined): string | undefined {
  const base = normalizeText(value);
  if (base === undefined) return undefined;

  const aliases: Record<string, string> = {
    en: "EN",
    eng: "EN",
    english: "EN",
    ja: "JA",
    jp: "JA",
    jpn: "JA",
    japanese: "JA",
    fr: "FR",
    french: "FR",
    de: "DE",
    german: "DE",
    es: "ES",
    spanish: "ES",
    it: "IT",
    italian: "IT",
    pt: "PT",
    portuguese: "PT",
    ko: "KO",
    korean: "KO",
    zh: "ZH",
    chinese: "ZH",
  };

  return aliases[base] ?? base.toUpperCase();
}
