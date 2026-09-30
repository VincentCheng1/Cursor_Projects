/**
 * Effective print year for catalogue identity (spec §30b).
 * Prefer variant.printYear when set; otherwise Set.releaseDate UTC year.
 */
export function releaseYearFromDate(date: Date | null | undefined): number | null {
  if (!date) return null;
  return date.getUTCFullYear();
}

export function effectivePrintYear(
  printYear: number | null | undefined,
  setReleaseDate: Date | null | undefined,
): number | null {
  if (printYear !== null && printYear !== undefined) return printYear;
  return releaseYearFromDate(setReleaseDate);
}
