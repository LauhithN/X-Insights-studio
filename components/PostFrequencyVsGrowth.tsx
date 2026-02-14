"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Label,
} from "recharts";
import { OverviewRow } from "@/lib/types";

type PostFrequencyVsGrowthProps = {
  rows: OverviewRow[];
};

const fmt = new Intl.NumberFormat("en-US");

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

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Compute Pearson correlation coefficient between two arrays.
 * Returns a value from -1 to 1, or 0 if insufficient data.
 */
function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;

  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;
  return numerator / denom;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0f14] px-4 py-3 shadow-card">
      <p className="text-xs font-medium text-white">{point.dateLabel}</p>
      <div className="mt-2 space-y-1 text-xs">
        <p className="text-slate">
          Posts: <span className="font-semibold text-white">{fmt.format(point.posts)}</span>
        </p>
        <p className="text-slate">
          New follows: <span className="font-semibold text-neon">{fmt.format(point.follows)}</span>
        </p>
        <p className="text-slate">
          Impressions: <span className="font-semibold text-white">{fmt.format(point.impressions)}</span>
        </p>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function PostFrequencyVsGrowth({ rows }: PostFrequencyVsGrowthProps) {
  const { data, medianPosts, medianFollows, correlation, insight } = useMemo(() => {
    const filtered = rows.filter(
      (row) => row.createPost !== null && row.createPost > 0
    );

    const points = filtered.map((row) => ({
      posts: row.createPost as number,
      follows: row.newFollows ?? 0,
      impressions: row.impressions,
      dateLabel: toDateLabel(row.date),
    }));

    const postsValues = points.map((p) => p.posts);
    const followsValues = points.map((p) => p.follows);

    const medP = median(postsValues);
    const medF = median(followsValues);
    const corr = pearsonCorrelation(postsValues, followsValues);

    const insightText =
      corr > 0.05
        ? "Your data suggests posting more correlates with growth."
        : "More posts doesn't mean more growth for you. Focus on quality.";

    return {
      data: points,
      medianPosts: medP,
      medianFollows: medF,
      correlation: corr,
      insight: insightText,
    };
  }, [rows]);

  if (!data.length) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <div className="pill">FREQUENCY</div>
        </div>
        <h3 className="mt-3 text-xl font-semibold text-white">
          Does Posting More = Growing More?
        </h3>
        <p className="mt-4 text-sm text-slate">
          No days with post-creation data found. Upload an overview CSV that
          includes the &quot;Posts created&quot; column to unlock this chart.
        </p>
      </div>
    );
  }

  const maxPosts = Math.max(...data.map((d) => d.posts));
  const maxFollows = Math.max(...data.map((d) => d.follows));

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="pill mb-3 inline-block">FREQUENCY</div>
        <h3 className="text-xl font-semibold text-white">
          Does Posting More = Growing More?
        </h3>
      </div>

      {/* Chart */}
      <div style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 28, right: 28, bottom: 12, left: 4 }}
          >
            <defs>
              <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="posts"
              name="Posts created"
              type="number"
              tick={{ fill: "#c8d5e2", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
              domain={[0, "auto"]}
            >
              <Label
                value="Posts created"
                position="insideBottom"
                offset={-4}
                style={{ fill: "#c8d5e2", fontSize: 11 }}
              />
            </XAxis>

            <YAxis
              dataKey="follows"
              name="New follows"
              type="number"
              tick={{ fill: "#c8d5e2", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
              domain={[0, "auto"]}
            >
              <Label
                value="New follows"
                angle={-90}
                position="insideLeft"
                offset={8}
                style={{ fill: "#c8d5e2", fontSize: 11 }}
              />
            </YAxis>

            <ZAxis
              dataKey="impressions"
              range={[40, 400]}
              name="Impressions"
            />

            {/* Median reference lines that divide quadrants */}
            <ReferenceLine
              x={medianPosts}
              stroke="rgba(255,255,255,0.10)"
              strokeDasharray="6 4"
            />
            <ReferenceLine
              y={medianFollows}
              stroke="rgba(255,255,255,0.10)"
              strokeDasharray="6 4"
            />

            {/* Quadrant labels via ReferenceLine with custom labels */}
            {/* Top-left: "Organic Growth" */}
            <ReferenceLine
              x={medianPosts * 0.35}
              y={medianFollows + (maxFollows - medianFollows) * 0.7}
              ifOverflow="extendDomain"
              stroke="none"
            >
              <Label
                value="Organic Growth"
                position="center"
                style={{
                  fill: "#c8d5e2",
                  fontSize: 10,
                  fontWeight: 500,
                  opacity: 0.6,
                }}
              />
            </ReferenceLine>

            {/* Top-right: "Sweet Spot" */}
            <ReferenceLine
              x={medianPosts + (maxPosts - medianPosts) * 0.65}
              y={medianFollows + (maxFollows - medianFollows) * 0.7}
              ifOverflow="extendDomain"
              stroke="none"
            >
              <Label
                value="Sweet Spot"
                position="center"
                style={{
                  fill: "#6ef3c5",
                  fontSize: 10,
                  fontWeight: 600,
                  opacity: 0.75,
                }}
              />
            </ReferenceLine>

            {/* Bottom-right: "Diminishing Returns" */}
            <ReferenceLine
              x={medianPosts + (maxPosts - medianPosts) * 0.65}
              y={medianFollows * 0.35}
              ifOverflow="extendDomain"
              stroke="none"
            >
              <Label
                value="Diminishing Returns"
                position="center"
                style={{
                  fill: "#ff7a59",
                  fontSize: 10,
                  fontWeight: 500,
                  opacity: 0.65,
                }}
              />
            </ReferenceLine>

            {/* Bottom-left: "Room to Grow" */}
            <ReferenceLine
              x={medianPosts * 0.35}
              y={medianFollows * 0.35}
              ifOverflow="extendDomain"
              stroke="none"
            >
              <Label
                value="Room to Grow"
                position="center"
                style={{
                  fill: "#c8d5e2",
                  fontSize: 10,
                  fontWeight: 500,
                  opacity: 0.6,
                }}
              />
            </ReferenceLine>

            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.15)" }}
              content={<CustomTooltip />}
              wrapperStyle={{ outline: "none" }}
            />

            <Scatter
              data={data}
              fill="#6ef3c5"
              fillOpacity={0.85}
              strokeWidth={0}
              style={{ filter: "url(#neon-glow)" }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Insight text */}
      <p className="mt-4 text-xs text-slate">
        {insight}
        <span className="ml-2 text-slate/50">
          (r = {correlation >= 0 ? "+" : ""}
          {correlation.toFixed(2)})
        </span>
      </p>
    </div>
  );
}
