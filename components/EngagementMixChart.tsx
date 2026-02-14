"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { TooltipProps } from "recharts";
import { OverviewRow } from "@/lib/types";

type EngagementMixChartProps = {
  rows: OverviewRow[];
};

/* ── colour palette ─────────────────────────────────────────────── */

const SERIES = [
  { key: "likes",     label: "Likes",     color: "#6ef3c5" },
  { key: "replies",   label: "Replies",   color: "#ff7a59" },
  { key: "reposts",   label: "Reposts",   color: "#a78bfa" },
  { key: "bookmarks", label: "Bookmarks", color: "#38bdf8" },
  { key: "shares",    label: "Shares",    color: "#fbbf24" }
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

/* ── helpers ─────────────────────────────────────────────────────── */

const fmt = new Intl.NumberFormat("en-US");

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

function toDateLabel(dateKey: string): string {
  const [yearText, monthText, dayText] = dateKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return dateKey;
  return dateLabelFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

/* ── custom tooltip ──────────────────────────────────────────────── */

type DayDatum = { dateLabel: string } & Record<SeriesKey, number>;

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((s, p) => s + ((p.value as number) ?? 0), 0);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0f14] px-4 py-3 shadow-lg">
      <p className="mb-2 text-xs font-medium text-slate">{label}</p>
      <div className="space-y-1.5">
        {[...payload].reverse().map((entry) => {
          const val = (entry.value as number) ?? 0;
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs">
              <span className="flex items-center gap-2 text-white/90">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="tabular-nums text-white">
                {fmt.format(val)}{" "}
                <span className="text-slate/70">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
      {total > 0 && (
        <div className="mt-2 border-t border-white/10 pt-2 text-right text-[11px] font-semibold text-white">
          Total {fmt.format(total)}
        </div>
      )}
    </div>
  );
}

/* ── component ───────────────────────────────────────────────────── */

export default function EngagementMixChart({ rows }: EngagementMixChartProps) {
  const { chartData, totals, dominant, hasData } = useMemo(() => {
    const sorted = [...rows]
      .filter((r) => r.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalsAcc: Record<SeriesKey, number> = {
      likes: 0,
      replies: 0,
      reposts: 0,
      bookmarks: 0,
      shares: 0
    };

    const mapped: DayDatum[] = sorted.map((row) => {
      const likes     = row.likes     ?? 0;
      const replies   = row.replies   ?? 0;
      const reposts   = row.reposts   ?? 0;
      const bookmarks = row.bookmarks ?? 0;
      const shares    = row.shares    ?? 0;

      totalsAcc.likes     += likes;
      totalsAcc.replies   += replies;
      totalsAcc.reposts   += reposts;
      totalsAcc.bookmarks += bookmarks;
      totalsAcc.shares    += shares;

      return {
        dateLabel: toDateLabel(row.date),
        likes,
        replies,
        reposts,
        bookmarks,
        shares
      };
    });

    const grandTotal = Object.values(totalsAcc).reduce((a, b) => a + b, 0);

    let dominantEntry: { label: string; color: string; pct: string } | null = null;
    if (grandTotal > 0) {
      let maxKey: SeriesKey = "likes";
      let maxVal = 0;
      for (const s of SERIES) {
        if (totalsAcc[s.key] > maxVal) {
          maxVal = totalsAcc[s.key];
          maxKey = s.key;
        }
      }
      const match = SERIES.find((s) => s.key === maxKey)!;
      dominantEntry = {
        label: match.label,
        color: match.color,
        pct: ((maxVal / grandTotal) * 100).toFixed(1)
      };
    }

    return {
      chartData: mapped,
      totals: totalsAcc,
      dominant: dominantEntry,
      hasData: grandTotal > 0
    };
  }, [rows]);

  /* ── empty state ─────────────────────────────────────────────── */

  if (!hasData) {
    return (
      <div className="glass-card p-6 text-sm text-slate">
        No engagement data available. Upload an overview CSV with likes, replies, reposts,
        bookmarks, or shares to see your engagement mix.
      </div>
    );
  }

  /* ── render ──────────────────────────────────────────────────── */

  return (
    <div className="glass-card p-5">
      {/* header */}
      <div className="mb-4 space-y-1">
        <div className="pill inline-block">Engagement DNA</div>
        <h3 className="text-lg font-semibold text-white">How Your Audience Engages</h3>

        {/* insight */}
        {dominant && (
          <p className="text-xs text-slate">
            Your audience primarily expresses engagement through{" "}
            <span className="font-semibold" style={{ color: dominant.color }}>
              {dominant.label}
            </span>{" "}
            <span className="text-slate/70">({dominant.pct}% of all engagement)</span>
          </p>
        )}
      </div>

      {/* chart */}
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.15} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.06)" />

            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "#c8d5e2", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              tick={{ fill: "#c8d5e2", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickFormatter={(v: number) => fmt.format(v)}
            />

            <Tooltip content={<CustomTooltip />} />

            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stackId="engagement"
                stroke={s.color}
                strokeWidth={1.5}
                fill={`url(#grad-${s.key})`}
                fillOpacity={0.7}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs text-slate">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-white/90">{s.label}</span>
            <span className="tabular-nums text-slate/70">{fmt.format(totals[s.key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
