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
      <div className="glass-card p-6 text-sm text-slate">
        Upload a content CSV with impressions and new follows to see top conversion tweets.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-[11px] uppercase tracking-[0.18em] text-slate/80">
          <tr>
            <th className="px-4 py-3">Post</th>
            <th className="px-4 py-3">Impressions</th>
            <th className="px-4 py-3">New follows</th>
            <th className="px-4 py-3">Follows / 1k</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map(({ row, score }, index) => (
            <tr key={`${row.id ?? index}`} className="border-t border-white/5 hover:bg-white/5">
              <td className="px-4 py-4">
                <p className="max-w-xs text-white">{row.text || "(No text)"}</p>
              </td>
              <td className="px-4 py-4 text-slate/80">{formatNumber(row.impressions)}</td>
              <td className="px-4 py-4 text-slate/80">{formatNumber(row.newFollows)}</td>
              <td className="px-4 py-4 font-semibold text-neon">{score.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
