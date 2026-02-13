"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ContentRow, OverviewRow } from "@/lib/types";
import { dayOf, engagementCount, engagementRate, followsPer1k, formatNumber, hourOf } from "@/lib/metrics";

type HeatmapMetric = "followsPer1k" | "engagementRate" | "frequency";
type ActiveCard = "conversion" | "scatter" | "timing" | "trends";
type TimingView = "day" | "hour";

type ChartInsightsReportProps = {
  contentRows: ContentRow[];
  overviewRows: OverviewRow[];
  contentMissingOptional: string[];
  heatmapMetric: HeatmapMetric;
};

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function percentile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)));
  return sorted[index];
}

function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;

  const xMean = average(xs);
  const yMean = average(ys);

  let numerator = 0;
  let xVariance = 0;
  let yVariance = 0;

  for (let i = 0; i < xs.length; i += 1) {
    const xDiff = xs[i] - xMean;
    const yDiff = ys[i] - yMean;
    numerator += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xVariance * yVariance);
  if (denominator === 0) return null;
  return numerator / denominator;
}

function truncateText(value: string, maxLength = 54): string {
  const clean = value.trim();
  if (!clean) return "(No text)";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3)}...`;
}

function percentChange(previous: number, current: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function metricValueLabel(metric: HeatmapMetric, value: number): string {
  if (metric === "frequency") return formatNumber(Math.round(value));
  if (metric === "engagementRate") return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(2);
}

function chartTooltipStyle() {
  return {
    background: "#120f0b",
    border: "1px solid rgba(247, 224, 188, 0.28)",
    borderRadius: 10,
    color: "#f5ead5"
  };
}

export default function ChartInsightsReport({
  contentRows,
  overviewRows,
  contentMissingOptional,
  heatmapMetric
}: ChartInsightsReportProps) {
  const [activeCard, setActiveCard] = useState<ActiveCard>("conversion");
  const [timingView, setTimingView] = useState<TimingView>("day");

  const hasFollows = !contentMissingOptional.includes("newFollows");
  const engagementFields = ["likes", "replies", "reposts", "bookmarks", "shares"];
  const hasEngagement = engagementFields.some((field) => !contentMissingOptional.includes(field));

  const conversion = useMemo(() => {
    if (!hasFollows) {
      return {
        available: false as const,
        message: "Missing new follows column."
      };
    }

    const candidates = contentRows.filter((row) => row.impressions > 0);
    if (!candidates.length) {
      return {
        available: false as const,
        message: "No posts with impressions."
      };
    }

    const ranked = candidates
      .map((row) => ({ row, score: followsPer1k(row) }))
      .sort((a, b) => b.score - a.score);

    const topSeries = ranked.slice(0, 6).map((entry, index) => ({
      rank: `#${index + 1}`,
      score: Number(entry.score.toFixed(2)),
      follows: entry.row.newFollows,
      impressions: entry.row.impressions,
      text: truncateText(entry.row.text)
    }));

    const scores = ranked.map((entry) => entry.score);
    const topPost = ranked[0];

    return {
      available: true as const,
      postsCount: candidates.length,
      topScore: topPost.score,
      medianScore: median(scores),
      topSeries
    };
  }, [contentRows, hasFollows]);

  const scatter = useMemo(() => {
    if (!hasEngagement && !hasFollows) {
      return {
        available: false as const,
        message: "Missing engagement and follows fields."
      };
    }

    const points = contentRows
      .map((row) => ({
        engagements: engagementCount(row),
        follows: row.newFollows,
        text: truncateText(row.text, 42)
      }))
      .filter((point) => point.engagements > 0 || point.follows > 0);

    if (!points.length) {
      return {
        available: false as const,
        message: "No measurable engagement/follows points."
      };
    }

    const limitedPoints = points.slice(0, 180);
    const engagements = limitedPoints.map((point) => point.engagements);
    const follows = limitedPoints.map((point) => point.follows);
    const correlation = hasEngagement && hasFollows ? pearsonCorrelation(engagements, follows) : null;

    const highEngagementCutoff = percentile(engagements, 0.75);
    const highEngagementPoints = limitedPoints.filter((point) => point.engagements >= highEngagementCutoff);
    const zeroFollows = highEngagementPoints.filter((point) => point.follows === 0).length;

    return {
      available: true as const,
      pointsCount: limitedPoints.length,
      correlation,
      highEngagementPoints: highEngagementPoints.length,
      zeroFollows,
      points: limitedPoints
    };
  }, [contentRows, hasEngagement, hasFollows]);

  const timing = useMemo(() => {
    const timedRows = contentRows
      .map((row) => {
        const day = dayOf(row);
        const hour = hourOf(row);
        if (day === null || hour === null) return null;
        return { row, day, hour };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    if (!timedRows.length) {
      return {
        available: false as const,
        message: "No valid timestamps."
      };
    }

    const daySeries = DAYS_SHORT.map((label) => ({ label, count: 0 }));
    const hourSeries = Array.from({ length: 24 }, (_, hour) => ({
      label: hour.toString().padStart(2, "0"),
      count: 0
    }));

    const cells = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ sum: 0, count: 0 })));

    timedRows.forEach(({ row, day, hour }) => {
      daySeries[day].count += 1;
      hourSeries[hour].count += 1;

      let value = 1;
      if (heatmapMetric === "followsPer1k") value = followsPer1k(row);
      if (heatmapMetric === "engagementRate") value = engagementRate(row);

      cells[day][hour].sum += value;
      cells[day][hour].count += 1;
    });

    let bestDay = 0;
    let bestHour = 0;
    let bestValue = -1;
    let bestPosts = 0;

    for (let day = 0; day < 7; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const cell = cells[day][hour];
        if (!cell.count) continue;

        const metricValue = heatmapMetric === "frequency" ? cell.count : cell.sum / cell.count;
        if (metricValue > bestValue) {
          bestValue = metricValue;
          bestDay = day;
          bestHour = hour;
          bestPosts = cell.count;
        }
      }
    }

    return {
      available: true as const,
      timedRowsCount: timedRows.length,
      bestDay,
      bestHour,
      bestValue,
      bestPosts,
      daySeries,
      hourSeries
    };
  }, [contentRows, heatmapMetric]);

  const trends = useMemo(() => {
    if (!overviewRows.length) {
      return {
        available: false as const,
        message: "Overview CSV not loaded."
      };
    }

    const rows = [...overviewRows]
      .filter((row) => row.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (!rows.length) {
      return {
        available: false as const,
        message: "Overview dates are invalid."
      };
    }

    const window = rows.slice(-30);
    const impressionBaseline = window.find((row) => row.impressions > 0)?.impressions ?? 1;
    const followsBaseline = window.find((row) => row.newFollows > 0)?.newFollows ?? 1;

    const series = window.map((row) => ({
      label: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      impressionsIndex: (row.impressions / impressionBaseline) * 100,
      followsIndex: (row.newFollows / followsBaseline) * 100
    }));

    const first = series[0];
    const last = series[series.length - 1];

    return {
      available: true as const,
      rowsCount: rows.length,
      impressionsChange: percentChange(first.impressionsIndex, last.impressionsIndex),
      followsChange: percentChange(first.followsIndex, last.followsIndex),
      series
    };
  }, [overviewRows]);

  const quickTakeaway = useMemo(() => {
    if (activeCard === "conversion") {
      if (!conversion.available) return conversion.message;
      return `Top post converts ${conversion.topScore.toFixed(2)} follows/1k. Median is ${conversion.medianScore.toFixed(2)}.`;
    }

    if (activeCard === "scatter") {
      if (!scatter.available) return scatter.message;
      if (scatter.correlation === null) return "Correlation needs both engagement and follows fields.";
      return `Engagement-to-follows correlation: r ${scatter.correlation.toFixed(2)}.`;
    }

    if (activeCard === "timing") {
      if (!timing.available) return timing.message;
      return `Best slot: ${DAYS_SHORT[timing.bestDay]} ${timing.bestHour
        .toString()
        .padStart(2, "0")}:00 (${formatNumber(timing.bestPosts)} posts sampled).`;
    }

    if (!trends.available) return trends.message;
    const impr = trends.impressionsChange === null ? "n/a" : `${trends.impressionsChange >= 0 ? "+" : ""}${trends.impressionsChange.toFixed(1)}%`;
    const follows = trends.followsChange === null ? "n/a" : `${trends.followsChange >= 0 ? "+" : ""}${trends.followsChange.toFixed(1)}%`;
    return `Recent trend: impressions ${impr}, follows ${follows} (index baseline = 100).`;
  }, [activeCard, conversion, scatter, timing, trends]);

  const timingBars = timing.available ? (timingView === "day" ? timing.daySeries : timing.hourSeries) : [];

  return (
    <section className="space-y-4 motion-rise">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Chart Findings</p>
          <h3 className="section-title">Interactive Mini Insights</h3>
        </div>
        <span className="soft-chip">Tap any card to focus</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article
          className={`glass-card p-5 transition ${activeCard === "conversion" ? "border-neon/60" : "border-edge"}`}
        >
          <button type="button" onClick={() => setActiveCard("conversion")} className="w-full text-left">
            <p className="section-eyebrow">Conversion</p>
            <h4 className="mt-1 text-lg font-semibold text-white">Top Follower Efficiency</h4>
          </button>

          {conversion.available ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="soft-chip">Top {conversion.topScore.toFixed(2)} /1k</span>
                <span className="soft-chip">Median {conversion.medianScore.toFixed(2)} /1k</span>
                <span className="soft-chip">Posts {formatNumber(conversion.postsCount)}</span>
              </div>
              <div className="mt-4 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversion.topSeries}>
                    <CartesianGrid stroke="rgba(245, 229, 204, 0.08)" vertical={false} />
                    <XAxis dataKey="rank" tick={{ fill: "#c7b291", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#c7b291", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={chartTooltipStyle()}
                      formatter={(value: number) => [Number(value).toFixed(2), "follows / 1k"]}
                      labelFormatter={(label) => {
                        const item = conversion.topSeries.find((entry) => entry.rank === label);
                        return item ? `${label}: ${item.text}` : String(label);
                      }}
                    />
                    <Bar dataKey="score" fill="#d7ff70" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate/90">{conversion.message}</p>
          )}
        </article>

        <article
          className={`glass-card p-5 transition ${activeCard === "scatter" ? "border-neon/60" : "border-edge"}`}
        >
          <button type="button" onClick={() => setActiveCard("scatter")} className="w-full text-left">
            <p className="section-eyebrow">Scatter</p>
            <h4 className="mt-1 text-lg font-semibold text-white">Engagement vs Follows</h4>
          </button>

          {scatter.available ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="soft-chip">Points {formatNumber(scatter.pointsCount)}</span>
                <span className="soft-chip">
                  r {scatter.correlation === null ? "n/a" : scatter.correlation.toFixed(2)}
                </span>
                <span className="soft-chip">
                  Zero-follow highs {formatNumber(scatter.zeroFollows)}/{formatNumber(scatter.highEngagementPoints)}
                </span>
              </div>
              <div className="mt-4 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid stroke="rgba(245, 229, 204, 0.08)" />
                    <XAxis
                      type="number"
                      dataKey="engagements"
                      tick={{ fill: "#c7b291", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="follows"
                      tick={{ fill: "#c7b291", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(215, 255, 112, 0.35)", strokeDasharray: "4 4" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0]?.payload as {
                          engagements: number;
                          follows: number;
                          text: string;
                        };
                        return (
                          <div className="max-w-[240px] rounded-xl border border-edge/80 bg-ink/95 p-3 text-xs text-slate shadow-lift">
                            <p className="font-semibold text-white">Post sample</p>
                            <p className="mt-2 text-slate/85">{point.text}</p>
                            <p className="mt-2 text-slate/85">Engagements: {formatNumber(point.engagements)}</p>
                            <p className="text-slate/85">Follows: {formatNumber(point.follows)}</p>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={scatter.points} fill="#ff8652" fillOpacity={0.72} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate/90">{scatter.message}</p>
          )}
        </article>

        <article
          className={`glass-card p-5 transition ${activeCard === "timing" ? "border-neon/60" : "border-edge"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => setActiveCard("timing")} className="text-left">
              <p className="section-eyebrow">Timing</p>
              <h4 className="mt-1 text-lg font-semibold text-white">Best Posting Windows</h4>
            </button>
            <div className="flex items-center gap-1 rounded-full border border-edge/80 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setTimingView("day")}
                className={`rounded-full px-3 py-1 text-xs ${
                  timingView === "day" ? "bg-neon/25 text-white" : "text-slate"
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setTimingView("hour")}
                className={`rounded-full px-3 py-1 text-xs ${
                  timingView === "hour" ? "bg-neon/25 text-white" : "text-slate"
                }`}
              >
                Hour
              </button>
            </div>
          </div>

          {timing.available ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="soft-chip">
                  Peak {DAYS_SHORT[timing.bestDay]} {timing.bestHour.toString().padStart(2, "0")}:00
                </span>
                <span className="soft-chip">Posts {formatNumber(timing.timedRowsCount)}</span>
                <span className="soft-chip">
                  {heatmapMetric === "frequency" ? "Peak count" : "Peak metric"} {metricValueLabel(heatmapMetric, timing.bestValue)}
                </span>
              </div>
              <div className="mt-4 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timingBars}>
                    <CartesianGrid stroke="rgba(245, 229, 204, 0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#c7b291", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#c7b291", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle()} formatter={(value: number) => [formatNumber(Number(value)), "posts"]} />
                    <Bar dataKey="count" fill="#d7ff70" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate/90">{timing.message}</p>
          )}
        </article>

        <article
          className={`glass-card p-5 transition ${activeCard === "trends" ? "border-neon/60" : "border-edge"}`}
        >
          <button type="button" onClick={() => setActiveCard("trends")} className="w-full text-left">
            <p className="section-eyebrow">Momentum</p>
            <h4 className="mt-1 text-lg font-semibold text-white">Daily Trend Shift</h4>
          </button>

          {trends.available ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="soft-chip">Days {formatNumber(trends.rowsCount)}</span>
                <span className="soft-chip">
                  Impr {trends.impressionsChange === null ? "n/a" : `${trends.impressionsChange >= 0 ? "+" : ""}${trends.impressionsChange.toFixed(1)}%`}
                </span>
                <span className="soft-chip">
                  Follows {trends.followsChange === null ? "n/a" : `${trends.followsChange >= 0 ? "+" : ""}${trends.followsChange.toFixed(1)}%`}
                </span>
              </div>
              <div className="mt-4 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends.series}>
                    <CartesianGrid stroke="rgba(245, 229, 204, 0.08)" />
                    <XAxis dataKey="label" tick={{ fill: "#c7b291", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#c7b291", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={chartTooltipStyle()}
                      formatter={(value: number, name: string) => [`${Number(value).toFixed(1)}`, name]}
                    />
                    <Line type="monotone" dataKey="impressionsIndex" name="Impr idx" stroke="#d7ff70" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="followsIndex" name="Follows idx" stroke="#ff8652" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate/90">{trends.message}</p>
          )}
        </article>
      </div>

      <div className="glass-card p-4">
        <p className="section-eyebrow">Focused takeaway</p>
        <p className="mt-1 text-sm text-slate/90">{quickTakeaway}</p>
      </div>
    </section>
  );
}
