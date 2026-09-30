/**
 * Grading companies (spec §10).
 *
 * `RAW` means "confidently ungraded". Unknown grading status is represented by
 * `undefined`, never by `RAW` — a PSA 10 must never end up in a raw calculation.
 */
export const GRADING_COMPANIES = ["RAW", "PSA", "CGC", "BGS", "SGC", "OTHER"] as const;

export type GradingCompany = (typeof GRADING_COMPANIES)[number];

export const GRADING_COMPANY_LABELS: Record<GradingCompany, string> = {
  RAW: "Raw / Ungraded",
  PSA: "PSA",
  CGC: "CGC",
  BGS: "BGS",
  SGC: "SGC",
  OTHER: "Other",
};

export function isGradingCompany(value: unknown): value is GradingCompany {
  return typeof value === "string" && (GRADING_COMPANIES as readonly string[]).includes(value);
}

/**
 * Grades are stored as strings because scales differ between companies, but
 * "10" and "10.0" describe the same grade. Normalize before comparing.
 */
export function normalizeGrade(grade: string | null | undefined): string | undefined {
  if (grade === null || grade === undefined) return undefined;
  const trimmed = grade.trim();
  if (trimmed === "") return undefined;

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    // Drop trailing zeros so 10.0 === 10 and 9.50 === 9.5.
    return String(numeric);
  }
  return trimmed.toUpperCase();
}
