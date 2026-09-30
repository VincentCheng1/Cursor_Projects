import { formatMoney } from "@/lib/pricing/money";

export function ValueDisplay({
  value,
  salesUsed,
  lastUpdated,
}: {
  value: number | null;
  salesUsed: number;
  lastUpdated?: Date | string | null;
}) {
  if (value === null) {
    return (
      <div>
        <p className="text-3xl font-semibold text-zinc-500">—</p>
        <p className="mt-2 text-sm text-zinc-400">
          There isn&apos;t enough recent sales data to calculate a value yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-4xl font-semibold tabular-nums" data-testid="current-value">
        {formatMoney(value)}
      </p>
      <p className="mt-2 text-sm text-zinc-400" data-testid="sales-used-count">
        Based on {salesUsed} recent sales
      </p>
      {lastUpdated !== null && lastUpdated !== undefined && (
        <p className="mt-1 text-xs text-zinc-500">
          Last updated {new Date(lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}
