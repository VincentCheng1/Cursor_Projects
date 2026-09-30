import { formatMoney } from "@/lib/pricing/money";

type Row = {
  label: string;
  average: number | null;
  salesUsed: number;
  emphasize?: boolean;
};

export function SourceBreakdown({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h3 className="text-sm font-medium text-zinc-300">Source breakdown</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((row) => (
          <li
            key={row.label}
            className={`flex justify-between gap-4 ${row.emphasize ? "font-medium text-white" : "text-zinc-300"}`}
          >
            <span>{row.label}</span>
            <span className="tabular-nums">
              {row.average === null ? "—" : formatMoney(row.average)}
              <span className="ml-2 text-zinc-500">({row.salesUsed} sales)</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-zinc-500">
        Combined is not the midpoint of the rows above — it pools the most recent qualifying
        sales across sources (spec §22).
      </p>
    </div>
  );
}
