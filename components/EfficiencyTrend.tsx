"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { OverviewRow } from "@/lib/types";

type EfficiencyTrendProps = {
  rows: OverviewRow[];
};

/* ------------------------------------------------------------------ */
/*  Date helpers                                                      */
/* ------------------------------------------------------------------ */

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function toDateLabel(dateKey: string): string {
  const [yearText, monthText, dayText] = dateKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return dateKey;
  return dateLabelFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                    */
/* ------------------------------------------------------------------ */

type PayloadItem = {
  dataKey: string;
  value: number;
  payload: ChartPoint;
};

type ChartPoint = {
  dateLabel: string;
  rawDate: string;
  efficiency: number;
  sma7: number | null;
  impressions: number;
  engagements: number;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0f14] px-4 py-3 shadow-card">
      <p className="mb-2 text-xs font-medium text-slate">
        {point.dateLabel}
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate/80">Efficiency</span>
          <span className="font-semibold text-neon">
            {point.efficiency.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate/80">7-day avg</span>
          <span className="font-semibold text-white/70">
            {point.sma7 != null ? `${point.sma7.toFixed(2)}%` : "\u2014"}
          </span>
        </div>
        <div className="mt-1 border-t border-white/10 pt-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate/60">Impressions</span>
            <span className="text-slate">
              {point.impressions.toLocaleString("en-US")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate/60">Engagements</span>
            <span className="text-slate">
              {point.engagements.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Gradient definition (shared SVG defs)                             */
/* ------------------------------------------------------------------ */

function EfficiencyGradient() {
  return (
    <defs>
      <linearGradient id="efficiencyFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6ef3c5" stopOpacity={0.3} />
        <stop offset="70%" stopColor="#6ef3c5" stopOpacity={0.06} />
        <stop offset="100%" stopColor="#6ef3c5" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function EfficiencyTrend({ rows }: EfficiencyTrendProps) {
  const { data, overallAvg, bestDay, trendLabel, trendUp } = useMemo(() => {
    /* 1. Sort by date ascending & compute daily efficiency */
    const sorted = [...rows]
      .filter((r) => r.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    const dailyPoints: {
      rawDate: string;
      dateLabel: string;
      efficiency: number;
      impressions: number;
      engagements: number;
    }[] = [];

    for (const row of sorted) {
      const eng = row.engagements ?? 0;
      const imp = row.impressions;
      if (imp <= 0) continue;
      dailyPoints.push({
        rawDate: row.date,
        dateLabel: toDateLabel(row.date),
        efficiency: (eng / imp) * 100,
        impressions: imp,
        engagements: eng,
      });
    }

    if (!dailyPoints.length) {
      return {
        data: [] as ChartPoint[],
        overallAvg: 0,
        bestDay: null as { dateLabel: string; efficiency: number } | null,
        trendLabel: "N/A",
        trendUp: false,
      };
    }

    /* 2. Overall average */
    const totalEff = dailyPoints.reduce((s, p) => s + p.efficiency, 0);
    const avg = totalEff / dailyPoints.length;

    /* 3. Best day */
    let best = dailyPoints[0];
    for (const p of dailyPoints) {
      if (p.efficiency > best.efficiency) best = p;
    }

    /* 4. 7-day SMA */
    const chartData: ChartPoint[] = dailyPoints.map((p, i) => {
      let sma7: number | null = null;
      if (i >= 6) {
        let sum = 0;
        for (let j = i - 6; j <= i; j++) {
          sum += dailyPoints[j].efficiency;
        }
        sma7 = sum / 7;
      }
      return { ...p, sma7 };
    });

    /* 5. Trend: last 7 days average vs overall */
    const last7 = dailyPoints.slice(-7);
    const last7Avg =
      last7.reduce((s, p) => s + p.efficiency, 0) / last7.length;

    return {
      data: chartData,
      overallAvg: avg,
      bestDay: { dateLabel: best.dateLabel, efficiency: best.efficiency },
      trendLabel: last7Avg >= avg ? "Improving" : "Declining",
      trendUp: last7Avg >= avg,
    };
  }, [rows]);

  /* ---------- Empty state ---------- */
  if (!data.length) {
    return (
      <div className="glass-card p-6 text-sm text-slate">
        No engagement or impression data available for efficiency analysis.
      </div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div className="glass-card relative overflow-hidden p-6">
      {/* Top glow accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/70 to-transparent" />

      {/* Section header */}
      <div className="mb-5">
        <div className="pill mb-2 inline-block">EFFICIENCY</div>
        <h3 className="text-lg font-semibold text-white">
          Engagement Efficiency Over Time
        </h3>
      </div>

      {/* Mini stat blocks */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {/* Average efficiency */}
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate/70">
            Average efficiency
          </p>
          <p className="font-data mt-1 text-xl font-semibold text-white">
            {overallAvg.toFixed(2)}%
          </p>
        </div>

        {/* Best day */}
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate/70">
            Best day
          </p>
          <p className="font-data mt-1 text-xl font-semibold text-white">
            {bestDay ? `${bestDay.efficiency.toFixed(2)}%` : "\u2014"}
          </p>
          {bestDay && (
            <p className="mt-0.5 text-[11px] text-slate/60">
              {bestDay.dateLabel}
            </p>
          )}
        </div>

        {/* Trend */}
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate/70">
            Trend
          </p>
          <p
            className={`font-data mt-1 text-xl font-semibold ${
              trendUp ? "text-neon" : "text-ember"
            }`}
          >
            {trendLabel}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 24, bottom: 4, left: 4 }}
          >
            <EfficiencyGradient />

            <CartesianGrid
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="none"
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
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              width={52}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "rgba(255,255,255,0.12)",
                strokeWidth: 1,
              }}
            />

            {/* Gradient area fill under main line */}
            <Area
              type="monotone"
              dataKey="efficiency"
              fill="url(#efficiencyFill)"
              stroke="none"
              isAnimationActive={true}
              animationDuration={800}
            />

            {/* 7-day SMA line (subtle, dashed) */}
            <Line
              type="monotone"
              dataKey="sma7"
              name="7-day avg"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={1000}
            />

            {/* Main efficiency line */}
            <Line
              type="monotone"
              dataKey="efficiency"
              name="Efficiency"
              stroke="#6ef3c5"
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "#0b0f14",
                stroke: "#6ef3c5",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 5,
                fill: "#6ef3c5",
                stroke: "#0b0f14",
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={800}
            />

            {/* Reference line at overall average */}
            <ReferenceLine
              y={overallAvg}
              stroke="#ff7a59"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              label={{
                value: "Avg",
                position: "right",
                fill: "#ff7a59",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
