"use client";

import { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { OverviewRow } from "@/lib/types";

type NetFollowerGrowthProps = {
  rows: OverviewRow[];
};

/* ---------- formatters ---------- */

const fmt = new Intl.NumberFormat("en-US");

function fmtNum(value: number): string {
  return fmt.format(value);
}

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

/* ---------- custom bar shape with rounded top ---------- */

function RoundedBar(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: { follows: number; unfollowsNeg: number };
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill = "#6ef3c5" } = props;
  if (height === 0) return null;

  const radius = Math.min(4, Math.abs(width) / 2, Math.abs(height) / 2);
  const isNegative = height < 0;
  const absH = Math.abs(height);
  const actualY = isNegative ? y : y;

  if (isNegative) {
    // Bar going downward: rounded bottom
    const topY = y;
    return (
      <path
        d={`
          M ${x},${topY}
          L ${x + width},${topY}
          L ${x + width},${topY + absH - radius}
          Q ${x + width},${topY + absH} ${x + width - radius},${topY + absH}
          L ${x + radius},${topY + absH}
          Q ${x},${topY + absH} ${x},${topY + absH - radius}
          Z
        `}
        fill={fill}
      />
    );
  }

  // Bar going upward: rounded top
  return (
    <path
      d={`
        M ${x},${actualY + absH}
        L ${x},${actualY + radius}
        Q ${x},${actualY} ${x + radius},${actualY}
        L ${x + width - radius},${actualY}
        Q ${x + width},${actualY} ${x + width},${actualY + radius}
        L ${x + width},${actualY + absH}
        Z
      `}
      fill={fill}
    />
  );
}

/* ---------- custom tooltip ---------- */

type TooltipEntry = {
  dateLabel: string;
  fullDate: string;
  follows: number;
  unfollowsNeg: number;
  unfollows: number;
  net: number;
  cumulativeNet: number;
};

function CustomTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: { payload: TooltipEntry }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div
      className="rounded-xl border border-white/10 px-4 py-3 shadow-lg"
      style={{
        background: "#0b0f14",
        minWidth: 200,
        backdropFilter: "blur(12px)"
      }}
    >
      <p className="mb-2.5 text-xs font-medium tracking-wide text-slate/70">
        {d.fullDate}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-xs text-slate">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "#6ef3c5" }}
            />
            Follows
          </span>
          <span className="text-sm font-semibold text-white">
            +{fmtNum(d.follows)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-xs text-slate">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "#ff7a59" }}
            />
            Unfollows
          </span>
          <span className="text-sm font-semibold" style={{ color: "#ff7a59" }}>
            -{fmtNum(d.unfollows)}
          </span>
        </div>
        <div className="my-1.5 h-px bg-white/10" />
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-slate">Net change</span>
          <span
            className="text-sm font-semibold"
            style={{ color: d.net >= 0 ? "#6ef3c5" : "#ff7a59" }}
          >
            {d.net >= 0 ? "+" : ""}
            {fmtNum(d.net)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-slate">Cumulative</span>
          <span
            className="text-sm font-bold"
            style={{
              color: d.cumulativeNet >= 0 ? "#ffffff" : "#ff7a59"
            }}
          >
            {d.cumulativeNet >= 0 ? "+" : ""}
            {fmtNum(d.cumulativeNet)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

export default function NetFollowerGrowth({ rows }: NetFollowerGrowthProps) {
  const { chartData, totalGained, totalLost, netGrowth, hasData } =
    useMemo(() => {
      const sorted = [...rows]
        .filter((r) => r.date)
        .sort((a, b) => a.date.localeCompare(b.date));

      let cumulative = 0;
      let gained = 0;
      let lost = 0;
      let anyFollowData = false;

      const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
      });

      const points = sorted.map((row) => {
        const follows = row.newFollows ?? 0;
        const unfollows = row.unfollows ?? 0;
        const net = follows - unfollows;
        cumulative += net;
        gained += follows;
        lost += unfollows;

        if (follows > 0 || unfollows > 0) anyFollowData = true;

        const [y, m, d] = row.date.split("-").map(Number);
        const fullDate =
          y && m && d
            ? fullDateFormatter.format(new Date(Date.UTC(y, m - 1, d)))
            : row.date;

        return {
          dateLabel: toDateLabel(row.date),
          fullDate,
          follows,
          unfollowsNeg: -unfollows,
          unfollows,
          net,
          cumulativeNet: cumulative
        };
      });

      return {
        chartData: points,
        totalGained: gained,
        totalLost: lost,
        netGrowth: gained - lost,
        hasData: anyFollowData
      };
    }, [rows]);

  /* ---------- empty state ---------- */

  if (!chartData.length || !hasData) {
    return (
      <div className="glass-card p-6">
        <div className="mb-4">
          <span className="pill">FOLLOWER FLOW</span>
          <h3 className="mt-3 text-xl font-semibold text-white">
            Net Follower Growth
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c8d5e2"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <p className="text-sm text-slate">
            No follow or unfollow data available.
          </p>
          <p className="mt-1 text-xs text-slate/60">
            Upload an overview CSV with &quot;New follows&quot; and
            &quot;Unfollows&quot; columns.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- render ---------- */

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="mb-5">
        <span className="pill">FOLLOWER FLOW</span>
        <h3 className="mt-3 text-xl font-semibold text-white">
          Net Follower Growth
        </h3>
      </div>

      {/* Summary stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {/* Total gained */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate/70">
            Total gained
          </p>
          <p
            className="mt-1 text-2xl font-semibold"
            style={{ color: "#6ef3c5" }}
          >
            +{fmtNum(totalGained)}
          </p>
        </div>
        {/* Total lost */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate/70">
            Total lost
          </p>
          <p
            className="mt-1 text-2xl font-semibold"
            style={{ color: "#ff7a59" }}
          >
            -{fmtNum(totalLost)}
          </p>
        </div>
        {/* Net growth */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate/70">
            Net growth
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {netGrowth >= 0 ? "+" : ""}
            {fmtNum(netGrowth)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
          >
            <defs>
              <linearGradient
                id="cumulativeGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#ffffff"
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor="#ffffff"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient
                id="followBarGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#6ef3c5"
                  stopOpacity={0.9}
                />
                <stop
                  offset="100%"
                  stopColor="#6ef3c5"
                  stopOpacity={0.5}
                />
              </linearGradient>
              <linearGradient
                id="unfollowBarGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#ff7a59"
                  stopOpacity={0.5}
                />
                <stop
                  offset="100%"
                  stopColor="#ff7a59"
                  stopOpacity={0.9}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "#c8d5e2", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              dy={6}
            />

            <YAxis
              tick={{ fill: "#c8d5e2", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtNum(v)}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                fill: "rgba(255,255,255,0.03)",
                stroke: "rgba(255,255,255,0.08)",
                strokeWidth: 1
              }}
            />

            {/* Follows bars (positive) */}
            <Bar
              dataKey="follows"
              name="Follows"
              fill="url(#followBarGradient)"
              shape={<RoundedBar />}
              maxBarSize={32}
            />

            {/* Unfollows bars (negative) */}
            <Bar
              dataKey="unfollowsNeg"
              name="Unfollows"
              fill="url(#unfollowBarGradient)"
              shape={<RoundedBar />}
              maxBarSize={32}
            />

            {/* Cumulative net growth area + line */}
            <Area
              type="monotone"
              dataKey="cumulativeNet"
              name="Cumulative"
              stroke="#ffffff"
              strokeWidth={2}
              fill="url(#cumulativeGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#ffffff",
                stroke: "#0b0f14",
                strokeWidth: 2
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
