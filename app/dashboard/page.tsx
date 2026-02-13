"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import StatCard from "@/components/StatCard";
import TopPostsTable from "@/components/TopPostsTable";
import ScatterEngagementVsFollows from "@/components/ScatterEngagementVsFollows";
import HeatmapDayHour from "@/components/HeatmapDayHour";
import ViralCard from "@/components/ViralCard";
import DailyTrends from "@/components/DailyTrends";
import ChartInsightsReport from "@/components/ChartInsightsReport";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import {
  engagementCount,
  engagementRate,
  followsPer1k,
  formatNumber,
  formatPercent,
  topBy
} from "@/lib/metrics";

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
            <TopPostsTable rows={contentRows} />
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
          </div>
          <div className="space-y-4">
            <div>
              <p className="section-eyebrow">Timing Intelligence</p>
              <h3 className="section-title">Posting Time Heatmap</h3>
            </div>
            <HeatmapDayHour key={`${chartRefreshKey}-heatmap-main`} rows={contentRows} metric={heatmapMetric} />
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
          </section>
        ) : null}

        <ChartInsightsReport
          contentRows={contentRows}
          overviewRows={overviewRows}
          contentMissingOptional={contentMissingOptional}
          heatmapMetric={heatmapMetric}
        />
      </div>
    </main>
  );
}
