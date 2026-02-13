"use client";

import { ContentRow } from "@/lib/types";
import { followsPer1k, formatNumber } from "@/lib/metrics";

type TopPostsTableProps = {
  rows: ContentRow[];
};

export default function TopPostsTable({ rows }: TopPostsTableProps) {
  const ranked = [...rows]
    .filter((row) => row.impressions > 0)
    .map((row) => ({ row, score: followsPer1k(row) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (!ranked.length) {
    return (
      <div className="glass-card p-6 text-sm text-slate/90">
        Upload a content CSV with impressions and new follows to see conversion leaders.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[740px] w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate/85">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Post</th>
              <th className="px-4 py-3">Impressions</th>
              <th className="px-4 py-3">New follows</th>
              <th className="px-4 py-3">Follows / 1k</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ row, score }, index) => (
              <tr key={`${row.id ?? index}`} className="border-t border-edge/40 transition hover:bg-white/[0.03]">
                <td className="px-4 py-4">
                  <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-edge/70 bg-white/[0.03] px-2 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <p className="max-w-lg text-white/95">{row.text || "(No text)"}</p>
                </td>
                <td className="px-4 py-4 font-data text-slate/90">{formatNumber(row.impressions)}</td>
                <td className="px-4 py-4 font-data text-slate/90">{formatNumber(row.newFollows)}</td>
                <td className="px-4 py-4 font-data font-semibold text-neon">{score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
