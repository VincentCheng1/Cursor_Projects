"use client";

import { useState } from "react";

import { formatMoney } from "@/lib/pricing/money";

export type UsedSaleRow = {
  source: string;
  saleDate: string;
  condition?: string;
  gradingCompany?: string;
  grade?: string;
  salePrice: string | number;
  shippingPrice?: string | number;
  totalPrice?: string | number;
  effectivePrice: number;
};

export function ViewSalesUsed({
  usedSales,
  oldestSaleDate,
  newestSaleDate,
}: {
  usedSales: UsedSaleRow[];
  oldestSaleDate?: string | null;
  newestSaleDate?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        View Sales Used
      </button>
      {open && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Condition</th>
                <th className="px-3 py-2">Grade</th>
                <th className="px-3 py-2">Sale</th>
                <th className="px-3 py-2">Shipping</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {usedSales.map((s, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="px-3 py-2">{new Date(s.saleDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{s.source}</td>
                  <td className="px-3 py-2">{s.condition ?? "—"}</td>
                  <td className="px-3 py-2">
                    {s.gradingCompany === "RAW" || !s.gradingCompany
                      ? "Raw"
                      : `${s.gradingCompany} ${s.grade ?? ""}`}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(s.salePrice)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {s.shippingPrice !== undefined ? formatMoney(s.shippingPrice) : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(s.effectivePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(oldestSaleDate || newestSaleDate) && (
            <p className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">
              {oldestSaleDate && (
                <>Oldest sale: {new Date(oldestSaleDate).toLocaleDateString()}. </>
              )}
              {newestSaleDate && (
                <>Newest sale: {new Date(newestSaleDate).toLocaleDateString()}.</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
