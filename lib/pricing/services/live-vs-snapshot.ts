/**
 * Whether a COMBINED snapshot timestamp is safe to show next to a live
 * card-page headline. Live compute is the display source of truth for value +
 * salesUsed; attaching a snapshot "Last updated" only when it describes that
 * same number avoids live-vs-snapshot disagreement on the card page.
 */
export function snapshotTimestampMatchesLive(params: {
  liveAverage: number | null;
  liveSalesUsed: number;
  snapshotAverage: number | null | undefined;
  snapshotSalesUsed: number | null | undefined;
}): boolean {
  const { liveAverage, liveSalesUsed, snapshotAverage, snapshotSalesUsed } = params;
  if (liveAverage === null) return false;
  if (snapshotAverage === null || snapshotAverage === undefined) return false;
  if (snapshotSalesUsed === null || snapshotSalesUsed === undefined) return false;
  if (snapshotSalesUsed !== liveSalesUsed) return false;
  return Math.round(snapshotAverage * 100) === Math.round(liveAverage * 100);
}
