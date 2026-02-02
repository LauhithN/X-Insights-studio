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

  const topConversion = topBy(contentRows, followsPer1k, 3);
  const canShowConversion = hasFollowsColumn && topConversion.length > 0;
  const scatterData = contentRows.filter((row) => engagementCount(row) > 0 || row.newFollows > 0);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="pill">Dashboard</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">X Insights Studio</h2>
            <p className="mt-2 text-sm text-slate/80">
              Content file: <span className="text-white">{contentFileName || "(loaded)"}</span>
              {overviewFileName ? (
                <span className="text-slate/80"> - Overview file: {overviewFileName}</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-full border border-edge/60 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Upload new CSV
            </button>
            <button
              onClick={() => {
                clear();
                router.push("/");
              }}
              className="rounded-full border border-ember/40 bg-ember/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember/30"
            >
              Reset data
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Posts loaded" value={formatNumber(contentRows.length)} />
          <StatCard label="Total impressions" value={formatNumber(totals.impressions)} />
          <StatCard label="Total follows" value={formatNumber(totals.follows)} />
          <StatCard label="Best engagement rate" value={formatPercent(totals.bestEngagementRate)} />
          <StatCard label="Best follows / 1k" value={totals.bestFollows ? totals.bestFollows.toFixed(2) : "0.00"} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-white">Top Tweets by Follower Conversion</h3>
            {!hasFollowsColumn ? (
              <p className="text-xs text-slate/80">New follows column missing. Upload a richer CSV for this ranking.</p>
            ) : null}
          </div>
          {hasFollowsColumn ? (
            <TopPostsTable rows={contentRows} />
          ) : (
            <div className="glass-card p-6 text-sm text-slate/80">
              Follows per 1k impressions requires a "New follows" column.
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Engagement != Growth</h3>
            {hasFollowsColumn || hasEngagementColumn ? (
              <ScatterEngagementVsFollows rows={contentRows} />
            ) : (
              <div className="glass-card p-6 text-sm text-slate/80">
                This chart needs engagement columns and/or new follows.
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Posting Time Heatmap</h3>
            <HeatmapDayHour rows={contentRows} metric={heatmapMetric} />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Viral Cards</h3>
          <div className="grid gap-6 lg:grid-cols-3">
            <ViralCard title="Top follower conversion" subtitle="Posts with the highest follows / 1k impressions">
              {canShowConversion ? (
                <div className="space-y-3">
                  {topConversion.map((row, index) => (
                    <div key={`${row.id ?? index}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-slate/80">#{index + 1}</p>
                      <p className="text-sm text-white">{row.text}</p>
                      <p className="mt-2 text-xs text-neon">
                        {followsPer1k(row).toFixed(2)} follows / 1k impressions
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate/80">Need follows + impressions to rank top conversion posts.</p>
              )}
            </ViralCard>

            <ViralCard title="Engagement != Growth" subtitle="High engagement does not always mean new followers">
              {scatterData.length ? (
                <ScatterEngagementVsFollows rows={contentRows} variant="plain" height={220} />
              ) : (
                <p className="text-xs text-slate/80">Upload engagement + follows data to render this card.</p>
              )}
            </ViralCard>

            <ViralCard title="Best posting times" subtitle="Heatmap by day and hour">
              <HeatmapDayHour rows={contentRows} metric={heatmapMetric} variant="plain" />
            </ViralCard>
          </div>
        </section>

        {overviewRows.length ? (
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Daily Trends</h3>
            <DailyTrends rows={overviewRows} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
