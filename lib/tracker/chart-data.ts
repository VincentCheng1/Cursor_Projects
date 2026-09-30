import type { TrackerHistorySeries } from "./history";

export type MergedChartRow = {
  at: string;
  label: string;
  [seriesId: string]: string | number | null;
};

/** Aligns COMBINED snapshot series on a shared time axis (gaps stay null). */
export function mergeTrackerChartData(series: TrackerHistorySeries[]): MergedChartRow[] {
  const timestamps = new Set<string>();
  for (const s of series) {
    for (const p of s.points) {
      if (p.averagePrice !== null) timestamps.add(p.at);
    }
  }

  const sorted = [...timestamps].sort();
  return sorted.map((at) => {
    const row: MergedChartRow = {
      at,
      label: new Date(at).toLocaleDateString(),
    };
    for (const s of series) {
      const point = s.points.find((p) => p.at === at);
      row[s.seriesId] = point?.averagePrice ?? null;
    }
    return row;
  });
}

export function rangeChangePercent(points: { averagePrice: number | null }[]): number | null {
  const values = points
    .map((p) => p.averagePrice)
    .filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}
