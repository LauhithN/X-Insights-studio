"use client";

import { useMemo } from "react";
import { ContentRow } from "@/lib/types";
import { followsPer1k, formatNumber } from "@/lib/metrics";

type TopPostsTableProps = {
  rows: ContentRow[];
};

export default function TopPostsTable({ rows }: TopPostsTableProps) {
  const ranked = useMemo(
    () =>
      [...rows]
        .filter((row) => row.impressions > 0)
        .map((row) => ({ row, score: followsPer1k(row) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
    [rows]
  );

  if (!ranked.length) {
    return (
      <div className="glass-card p-6 text-sm text-slate">
        Upload a content CSV with impressions and new follows to see top conversion tweets.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <p className="border-b border-white/5 px-4 py-2 text-xs text-slate/80 sm:hidden">
        Swipe horizontally to view all columns.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="bg-white/5 text-[11px] uppercase tracking-[0.18em] text-slate/90">
            <tr>
              <th className="px-3 py-3 sm:px-4">Post</th>
              <th className="px-3 py-3 sm:px-4">Impressions</th>
              <th className="px-3 py-3 sm:px-4">New follows</th>
              <th className="px-3 py-3 sm:px-4">Follows / 1k</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ row, score }, index) => (
              <tr key={`${row.id ?? index}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-3 py-3 sm:px-4 sm:py-4">
                  <p className="max-w-xs text-white">{row.text || "(No text)"}</p>
                </td>
                <td className="px-3 py-3 text-slate sm:px-4 sm:py-4">{formatNumber(row.impressions)}</td>
                <td className="px-3 py-3 text-slate sm:px-4 sm:py-4">
                  {row.newFollows === null ? "-" : formatNumber(row.newFollows)}
                </td>
                <td className="px-3 py-3 font-semibold text-neon sm:px-4 sm:py-4">{score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
