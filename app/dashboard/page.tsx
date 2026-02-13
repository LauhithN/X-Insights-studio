"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import StatCard from "@/components/StatCard";
import TopPostsTable from "@/components/TopPostsTable";
import ScatterEngagementVsFollows from "@/components/ScatterEngagementVsFollows";
import HeatmapDayHour from "@/components/HeatmapDayHour";
import ViralCard from "@/components/ViralCard";
import DailyTrends from "@/components/DailyTrends";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import {
  dayOf,
  engagementCount,
  engagementRate,
  followsPer1k,
  formatNumber,
  formatPercent,
  hourOf,
  topBy
} from "@/lib/metrics";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[middle - 1] + sorted[middle]) / 2;
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

function correlationLabel(value: number): string {
  const strength = Math.abs(value);
  if (strength >= 0.7) return "strong";
  if (strength >= 0.4) return "moderate";
  if (strength >= 0.2) return "weak";
  return "very weak";
}

function percentChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return (to - from) / from;
}

function hourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    contentRows,
    overviewRows,
    contentFileName,
    overviewFileName,
    contentMissingOptional,
    clear
  } = useAnalyticsStore();

  useEffect(() => {
    if (!contentRows.length) {
      router.replace("/");
    }
  }, [contentRows.length, router]);

  const totals = useMemo(() => {
    const impressions = contentRows.reduce((sum, row) => sum + row.impressions, 0);
    const follows = contentRows.reduce((sum, row) => sum + row.newFollows, 0);
    const bestEngagementRate = Math.max(0, ...contentRows.map((row) => engagementRate(row)));
    const bestFollows = Math.max(0, ...contentRows.map((row) => followsPer1k(row)));

    return { impressions, follows, bestEngagementRate, bestFollows };
  }, [contentRows]);

  const hasFollowsColumn = !contentMissingOptional.includes("newFollows");
  const engagementFields = ["likes", "replies", "reposts", "bookmarks", "shares"];
  const hasEngagementColumn = engagementFields.some((field) => !contentMissingOptional.includes(field));

  const heatmapMetric = hasFollowsColumn
    ? "followsPer1k"
    : hasEngagementColumn
      ? "engagementRate"
      : "frequency";
  const chartRefreshKey = `${contentFileName}-${overviewFileName}-${contentRows.length}-${overviewRows.length}`;

  const topConversion = topBy(contentRows, followsPer1k, 3);
  const canShowConversion = hasFollowsColumn && topConversion.length > 0;
  const scatterData = contentRows.filter((row) => engagementCount(row) > 0 || row.newFollows > 0);
  const conversionInsight = useMemo(() => {
    if (!hasFollowsColumn) return null;

    const ranked = contentRows
      .filter((row) => row.impressions > 0)
      .map((row) => ({ row, score: followsPer1k(row) }))
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) return null;

    const scores = ranked.map((entry) => entry.score);
    const best = ranked[0];
    return {
      rankedPosts: ranked.length,
      medianScore: median(scores),
      avgScore: average(scores),
      topScore: best.score,
      topImpressions: best.row.impressions,
      topFollows: best.row.newFollows
    };
  }, [contentRows, hasFollowsColumn]);

  const scatterInsight = useMemo(() => {
    if (!hasFollowsColumn && !hasEngagementColumn) return null;

    const points = contentRows
      .map((row) => ({ engagements: engagementCount(row), follows: row.newFollows }))
      .filter((point) => point.engagements > 0 || point.follows > 0);

    if (!points.length) return null;

    const engagements = points.map((point) => point.engagements);
    const follows = points.map((point) => point.follows);
    const correlation = hasFollowsColumn && hasEngagementColumn ? pearsonCorrelation(engagements, follows) : null;

    const highCutoff = percentile(engagements, 0.75);
    const highPoints = points.filter((point) => point.engagements >= highCutoff);
    const highZeroFollows = highPoints.filter((point) => point.follows === 0).length;

    return {
      pointsCount: points.length,
      correlation,
      highCutoff,
      highPoints: highPoints.length,
      highZeroFollows
    };
  }, [contentRows, hasEngagementColumn, hasFollowsColumn]);

  const heatmapInsight = useMemo(() => {
    const timedRows = contentRows
      .map((row) => {
        const day = dayOf(row);
        const hour = hourOf(row);
        if (day === null || hour === null) return null;
        return { row, day, hour, date: new Date(row.createdAt) };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    if (!timedRows.length) return null;

    const uniqueHours = new Set(timedRows.map((entry) => entry.hour)).size;
    const uniqueMinutes = new Set(timedRows.map((entry) => entry.date.getMinutes())).size;
    const likelyDateOnly = uniqueHours <= 1 && uniqueMinutes <= 1;

    const cells = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ count: 0, sum: 0 }))
    );
    const dayCounts = new Array<number>(7).fill(0);

    timedRows.forEach(({ row, day, hour }) => {
      let value = 1;
      if (heatmapMetric === "followsPer1k") value = followsPer1k(row);
      if (heatmapMetric === "engagementRate") value = engagementRate(row);

      cells[day][hour].count += 1;
      cells[day][hour].sum += value;
      dayCounts[day] += 1;
    });

    let bestDay = 0;
    let bestHour = 0;
    let bestValue = -1;
    let bestPosts = 0;

    for (let day = 0; day < 7; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const cell = cells[day][hour];
        if (!cell.count) continue;

        const value = heatmapMetric === "frequency" ? cell.count : cell.sum / cell.count;
        if (value > bestValue) {
          bestValue = value;
          bestDay = day;
          bestHour = hour;
          bestPosts = cell.count;
        }
      }
    }

    const busiestDay = dayCounts.indexOf(Math.max(...dayCounts));

    return {
      timedPosts: timedRows.length,
      likelyDateOnly,
      uniqueHours,
      bestDay,
      bestHour,
      bestPosts,
      busiestDay,
      busiestDayPosts: dayCounts[busiestDay]
    };
  }, [contentRows, heatmapMetric]);

  const trendInsight = useMemo(() => {
    if (!overviewRows.length) return null;

    const rows = [...overviewRows]
      .filter((row) => row.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (!rows.length) return null;

    const totalImpressions = rows.reduce((sum, row) => sum + row.impressions, 0);
    const totalFollows = rows.reduce((sum, row) => sum + row.newFollows, 0);
    const totalProfileVisits = rows.reduce((sum, row) => sum + row.profileVisits, 0);
    const peak = rows.reduce((best, row) => (row.impressions > best.impressions ? row : best));

    const window = Math.min(7, rows.length);
    const firstWindow = rows.slice(0, window);
    const lastWindow = rows.slice(-window);

    const firstImpressionsAvg = average(firstWindow.map((row) => row.impressions));
    const lastImpressionsAvg = average(lastWindow.map((row) => row.impressions));
    const firstFollowsAvg = average(firstWindow.map((row) => row.newFollows));
    const lastFollowsAvg = average(lastWindow.map((row) => row.newFollows));

    return {
      days: rows.length,
      totalImpressions,
      totalFollows,
      totalProfileVisits,
      peakDate: peak.date,
      peakImpressions: peak.impressions,
      impressionsDelta: percentChange(firstImpressionsAvg, lastImpressionsAvg),
      followsDelta: percentChange(firstFollowsAvg, lastFollowsAvg)
    };
  }, [overviewRows]);

  return (
    <main className="page-shell">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:gap-10">
        <header className="glass-card motion-rise overflow-hidden p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="pill">Dashboard</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                X Insights Command Center
              </h2>
              <p className="mt-3 text-sm text-slate/90 sm:text-base">
                Track what truly moves follower growth, compare it against engagement, and reuse successful posting
                windows with confidence.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="soft-chip">Content: {contentFileName || "Loaded session data"}</span>
                <span className="soft-chip">
                  {overviewFileName ? `Overview: ${overviewFileName}` : "Overview: not loaded"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push("/")} className="btn-secondary">
                Upload new CSV
              </button>
              <button
                onClick={() => {
                  clear();
                  router.push("/");
                }}
                className="btn-danger"
              >
                Reset data
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 stagger-rise">
          <StatCard label="Posts loaded" value={formatNumber(contentRows.length)} hint="Rows parsed from content CSV" />
          <StatCard label="Total impressions" value={formatNumber(totals.impressions)} hint="Aggregate post reach" />
          <StatCard label="Total follows" value={formatNumber(totals.follows)} hint="Attributed new follows" />
          <StatCard
            label="Best engagement rate"
            value={formatPercent(totals.bestEngagementRate)}
            hint="Highest single-post rate"
          />
          <StatCard
            label="Best follows / 1k"
            value={totals.bestFollows ? totals.bestFollows.toFixed(2) : "0.00"}
            hint="Top conversion efficiency"
          />
        </section>

        <section className="space-y-4 motion-rise">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow">Conversion Ranking</p>
              <h3 className="section-title">Top Posts by Follower Conversion</h3>
            </div>
            {!hasFollowsColumn ? (
              <p className="soft-chip border-ember/50 text-ember">
                "New follows" column missing. Ranking is unavailable.
              </p>
            ) : null}
          </div>
          {hasFollowsColumn ? (
            <>
              <TopPostsTable rows={contentRows} />
              {conversionInsight ? (
                <div className="glass-card mt-4 p-4 text-sm text-slate/90">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate/80">Key insights</p>
                  <ul className="mt-2 space-y-1.5">
                    <li>
                      Ranked {formatNumber(conversionInsight.rankedPosts)} posts with impressions for follower
                      conversion.
                    </li>
                    <li>
                      Median follows/1k is {conversionInsight.medianScore.toFixed(2)} and overall average is{" "}
                      {conversionInsight.avgScore.toFixed(2)}.
                    </li>
                    <li>
                      Top post delivered {conversionInsight.topScore.toFixed(2)} follows/1k from{" "}
                      {formatNumber(conversionInsight.topImpressions)} impressions and{" "}
                      {formatNumber(conversionInsight.topFollows)} follows.
                    </li>
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <div className="glass-card p-6 text-sm text-slate/90">
              Follows per 1k impressions requires a <span className="font-data text-sand">newFollows</span> column.
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2 motion-rise">
          <div className="space-y-4">
            <div>
              <p className="section-eyebrow">Correlation Check</p>
              <h3 className="section-title">Engagement vs Follower Growth</h3>
            </div>
            {hasFollowsColumn || hasEngagementColumn ? (
              <ScatterEngagementVsFollows key={`${chartRefreshKey}-scatter-main`} rows={contentRows} />
            ) : (
              <div className="glass-card p-6 text-sm text-slate/90">
                This chart needs engagement fields and/or new follows in the content export.
              </div>
            )}
            {scatterInsight ? (
              <div className="glass-card p-4 text-sm text-slate/90">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate/80">Key insights</p>
                <ul className="mt-2 space-y-1.5">
                  <li>Plotted {formatNumber(scatterInsight.pointsCount)} posts with engagement/follow signals.</li>
                  <li>
                    {scatterInsight.correlation === null
                      ? "Correlation is unavailable because engagement or follows fields are missing."
                      : `Engagement vs follows correlation is ${scatterInsight.correlation.toFixed(2)} (${correlationLabel(scatterInsight.correlation)}).`}
                  </li>
                  <li>
                    {formatNumber(scatterInsight.highZeroFollows)} of {formatNumber(scatterInsight.highPoints)} top
                    engagement posts (top quartile, {formatNumber(Math.round(scatterInsight.highCutoff))}+ engagements)
                    still drove zero follows.
                  </li>
                </ul>
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            <div>
              <p className="section-eyebrow">Timing Intelligence</p>
              <h3 className="section-title">Posting Time Heatmap</h3>
            </div>
            <HeatmapDayHour key={`${chartRefreshKey}-heatmap-main`} rows={contentRows} metric={heatmapMetric} />
            {heatmapInsight ? (
              <div className="glass-card p-4 text-sm text-slate/90">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate/80">Key insights</p>
                <ul className="mt-2 space-y-1.5">
                  <li>
                    Time analysis used {formatNumber(heatmapInsight.timedPosts)} posts across{" "}
                    {formatNumber(heatmapInsight.uniqueHours)} distinct hour bucket(s).
                  </li>
                  <li>
                    {heatmapInsight.likelyDateOnly
                      ? "This upload looks date-only, so hour-level timing conclusions are not reliable."
                      : `Best slot by current metric: ${DAY_LABELS[heatmapInsight.bestDay]} ${hourLabel(heatmapInsight.bestHour)} (${formatNumber(heatmapInsight.bestPosts)} posts sampled).`}
                  </li>
                  <li>
                    Busiest day was {DAY_LABELS[heatmapInsight.busiestDay]} with{" "}
                    {formatNumber(heatmapInsight.busiestDayPosts)} posts.
                  </li>
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 motion-rise">
          <div>
            <p className="section-eyebrow">Shareables</p>
            <h3 className="section-title">Viral Cards</h3>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <ViralCard title="Top follower conversion" subtitle="Posts with the highest follows / 1k impressions">
              {canShowConversion ? (
                <div className="space-y-3">
                  {topConversion.map((row, index) => (
                    <div key={`${row.id ?? index}`} className="rounded-xl border border-edge/70 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate/80">#{index + 1}</p>
                      <p className="text-sm text-white">{row.text}</p>
                      <p className="mt-2 text-xs font-semibold text-neon">
                        {followsPer1k(row).toFixed(2)} follows / 1k impressions
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate/85">Need follows + impressions to rank top conversion posts.</p>
              )}
            </ViralCard>

            <ViralCard title="Engagement != Growth" subtitle="High engagement does not always mean new followers">
              {scatterData.length ? (
                <ScatterEngagementVsFollows
                  key={`${chartRefreshKey}-scatter-card`}
                  rows={contentRows}
                  variant="plain"
                  height={220}
                />
              ) : (
                <p className="text-xs text-slate/85">Upload engagement + follows data to render this card.</p>
              )}
            </ViralCard>

            <ViralCard title="Best posting times" subtitle="Heatmap by day and hour">
              <HeatmapDayHour
                key={`${chartRefreshKey}-heatmap-card`}
                rows={contentRows}
                metric={heatmapMetric}
                variant="plain"
              />
            </ViralCard>
          </div>
        </section>

        {overviewRows.length ? (
          <section className="space-y-4 motion-rise">
            <div>
              <p className="section-eyebrow">Trendline</p>
              <h3 className="section-title">Daily Account Trends</h3>
            </div>
            <DailyTrends key={`${chartRefreshKey}-trends`} rows={overviewRows} />
            {trendInsight ? (
              <div className="glass-card p-4 text-sm text-slate/90">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate/80">Key insights</p>
                <ul className="mt-2 space-y-1.5">
                  <li>
                    Parsed {formatNumber(trendInsight.days)} days: {formatNumber(trendInsight.totalImpressions)}{" "}
                    impressions, {formatNumber(trendInsight.totalFollows)} follows,{" "}
                    {formatNumber(trendInsight.totalProfileVisits)} profile visits.
                  </li>
                  <li>
                    Peak day reached {formatNumber(trendInsight.peakImpressions)} impressions on{" "}
                    {new Date(trendInsight.peakDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}
                    .
                  </li>
                  <li>
                    {trendInsight.impressionsDelta === null
                      ? "Insufficient baseline for impression delta."
                      : `Recent daily impressions are ${trendInsight.impressionsDelta >= 0 ? "+" : ""}${(
                          trendInsight.impressionsDelta * 100
                        ).toFixed(1)}% vs the first window.`}{" "}
                    {trendInsight.followsDelta === null
                      ? ""
                      : `Follows are ${trendInsight.followsDelta >= 0 ? "+" : ""}${(
                          trendInsight.followsDelta * 100
                        ).toFixed(1)}% over the same comparison.`}
                  </li>
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
