"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import StatCard from "@/components/StatCard";
import TopPostsTable from "@/components/TopPostsTable";
import ScatterEngagementVsFollows from "@/components/ScatterEngagementVsFollows";
import HeatmapDayHour from "@/components/HeatmapDayHour";
import ViralCard from "@/components/ViralCard";
import DailyTrends from "@/components/DailyTrends";
import NetFollowerGrowth from "@/components/NetFollowerGrowth";
import PostFrequencyVsGrowth from "@/components/PostFrequencyVsGrowth";
import EngagementMixChart from "@/components/EngagementMixChart";
import EfficiencyTrend from "@/components/EfficiencyTrend";
import ProfileVisitFunnel from "@/components/ProfileVisitFunnel";
import ViralDayDetector from "@/components/ViralDayDetector";
import StreakConsistencyGrid from "@/components/StreakConsistencyGrid";
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

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardPage() {
  const router = useRouter();
  const hasHydrated = useAnalyticsStore((state) => state.hasHydrated);
  const contentRows = useAnalyticsStore((state) => state.contentRows);
  const overviewRows = useAnalyticsStore((state) => state.overviewRows);
  const contentFileName = useAnalyticsStore((state) => state.contentFileName);
  const overviewFileName = useAnalyticsStore((state) => state.overviewFileName);
  const contentMissingOptional = useAnalyticsStore((state) => state.contentMissingOptional);
  const clear = useAnalyticsStore((state) => state.clear);

  useEffect(() => {
    if (hasHydrated && !contentRows.length && !overviewRows.length) {
      router.replace("/");
    }
  }, [contentRows.length, overviewRows.length, hasHydrated, router]);

  const totals = useMemo(() => {
    const impressions = contentRows.reduce((sum, row) => sum + row.impressions, 0);
    const follows = contentRows.reduce((sum, row) => sum + (row.newFollows ?? 0), 0);
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

  const topConversion = useMemo(() => topBy(contentRows, followsPer1k, 3), [contentRows]);
  const canShowConversion = hasFollowsColumn && topConversion.length > 0;

  const scatterData = useMemo(
    () => contentRows.filter((row) => engagementCount(row) > 0 || (row.newFollows ?? 0) > 0),
    [contentRows]
  );

  const mismatchInsights = useMemo(
    () =>
      [...contentRows]
        .map((row) => {
          const engagements = engagementCount(row);
          const follows = row.newFollows ?? 0;
          const followsPerEngagement = engagements > 0 ? follows / engagements : 0;
          return { row, engagements, follows, followsPerEngagement };
        })
        .filter((entry) => entry.engagements > 0)
        .sort(
          (a, b) =>
            a.followsPerEngagement - b.followsPerEngagement || b.engagements - a.engagements
        )
        .slice(0, 3),
    [contentRows]
  );

  const bestTimeInsights = useMemo(() => {
    const slotMap = new Map<string, { day: number; hour: number; sum: number; count: number }>();

    contentRows.forEach((row) => {
      const day = dayOf(row);
      const hour = hourOf(row);
      if (day === null || hour === null) return;

      const key = `${day}-${hour}`;
      const existing = slotMap.get(key) ?? { day, hour, sum: 0, count: 0 };
      const value =
        heatmapMetric === "followsPer1k"
          ? followsPer1k(row)
          : heatmapMetric === "engagementRate"
            ? engagementRate(row)
            : 1;

      existing.sum += value;
      existing.count += 1;
      slotMap.set(key, existing);
    });

    return [...slotMap.values()]
      .map((entry) => ({
        ...entry,
        score:
          heatmapMetric === "frequency"
            ? entry.count
            : entry.count > 0
              ? entry.sum / entry.count
              : 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [contentRows, heatmapMetric]);

  if (!hasHydrated) {
    return (
      <main className="min-h-screen px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-slate/50">Loading saved analytics...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="fade-in-up flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border-l-2 border-neon/60 bg-white/[0.03] px-3 py-1.5 text-xs text-slate/70">Dashboard</div>
            <h2 className="mt-4 text-2xl font-medium tracking-tight text-white/90">X Insights Studio</h2>
            <p className="mt-2 text-sm text-slate/50">
              Content file: <span className="text-white/90">{contentFileName || "(loaded)"}</span>
              {overviewFileName ? (
                <span className="text-slate/50"> - Overview file: {overviewFileName}</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08]"
            >
              Upload new CSV
            </button>
            <button
              onClick={() => {
                clear();
                router.push("/");
              }}
              className="rounded-lg border border-red-400/15 bg-red-400/[0.04] px-4 py-2 text-sm font-medium text-red-400/70 transition-colors hover:bg-red-400/[0.08]"
            >
              Reset data
            </button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Posts loaded" value={formatNumber(contentRows.length)} />
          <StatCard label="Total impressions" value={formatNumber(totals.impressions)} />
          <StatCard label="Total follows" value={formatNumber(totals.follows)} />
          <StatCard label="Best engagement rate" value={formatPercent(totals.bestEngagementRate)} />
          <StatCard label="Best follows / 1k" value={totals.bestFollows ? totals.bestFollows.toFixed(2) : "0.00"} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-medium text-white/85">Top Tweets by Follower Conversion</h3>
            {!hasFollowsColumn ? (
              <p className="text-xs text-slate/50">New follows column missing. Upload a richer CSV for this ranking.</p>
            ) : null}
          </div>
          {hasFollowsColumn ? (
            <TopPostsTable rows={contentRows} />
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-slate/50">
              Follows per 1k impressions requires a &quot;New follows&quot; column.
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white/85">Engagement vs Growth</h3>
            {hasFollowsColumn || hasEngagementColumn ? (
              <ScatterEngagementVsFollows rows={contentRows} />
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-slate/50">
                This chart needs engagement columns and/or new follows.
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white/85">Posting Time Heatmap</h3>
            <HeatmapDayHour rows={contentRows} metric={heatmapMetric} />
            <p className="text-xs text-slate/50">Time buckets are calculated in UTC.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-medium text-white/85">Viral Cards</h3>
          <div className="grid gap-4 lg:grid-cols-3">
            <ViralCard title="Top follower conversion" subtitle="Posts with the highest follows / 1k impressions">
              {canShowConversion ? (
                <div className="space-y-3">
                  {topConversion.map((row, index) => (
                    <div key={`${row.id ?? index}`} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                      <p className="text-xs text-slate/50">#{index + 1}</p>
                      <p className="text-sm text-white">{row.text}</p>
                      <p className="mt-2 text-xs text-neon/70">
                        {followsPer1k(row).toFixed(2)} follows / 1k impressions
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate/50">Need follows + impressions to rank top conversion posts.</p>
              )}
            </ViralCard>

            <ViralCard title="Engagement vs Growth" subtitle="High engagement posts with weaker follow conversion">
              {mismatchInsights.length ? (
                <div className="space-y-3">
                  {mismatchInsights.map((item, index) => (
                    <div key={`${item.row.id ?? index}`} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                      <p className="text-xs text-slate/50">#{index + 1}</p>
                      <p className="text-sm text-white">{item.row.text || "(No text)"}</p>
                      <p className="mt-2 text-xs text-slate/50">
                        {formatNumber(item.engagements)} engagements, {formatNumber(item.follows)} follows
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate/50">Upload engagement + follows data to generate this insight.</p>
              )}
            </ViralCard>

            <ViralCard title="Best posting windows" subtitle="Top performance windows by day/hour (UTC)">
              {bestTimeInsights.length ? (
                <div className="space-y-3">
                  {bestTimeInsights.map((slot, index) => (
                    <div key={`${slot.day}-${slot.hour}`} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                      <p className="text-xs text-slate/50">#{index + 1}</p>
                      <p className="text-sm text-white">
                        {dayLabels[slot.day]} {slot.hour.toString().padStart(2, "0")}:00 UTC
                      </p>
                      <p className="mt-2 text-xs text-neon/70">
                        {heatmapMetric === "followsPer1k"
                          ? `${slot.score.toFixed(2)} follows / 1k`
                          : heatmapMetric === "engagementRate"
                            ? `${(slot.score * 100).toFixed(2)}% engagement rate`
                            : `${slot.count} posts`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate/50">Need valid timestamps to compute best posting windows.</p>
              )}
            </ViralCard>
          </div>
        </section>

        {overviewRows.length ? (
          <section className="space-y-4">
            <h3 className="text-lg font-medium text-white/85">Daily Trends</h3>
            <DailyTrends rows={overviewRows} />
          </section>
        ) : null}

        {overviewRows.length ? (
          <>
            <NetFollowerGrowth rows={overviewRows} />

            <section className="grid gap-6 lg:grid-cols-2">
              <PostFrequencyVsGrowth rows={overviewRows} />
              <ProfileVisitFunnel rows={overviewRows} />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <EngagementMixChart rows={overviewRows} />
              <EfficiencyTrend rows={overviewRows} />
            </section>

            <ViralDayDetector rows={overviewRows} />

            <StreakConsistencyGrid rows={overviewRows} />
          </>
        ) : null}

        {!scatterData.length ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-slate/50">
            Engagement and follow columns are sparse in this dataset; some growth visuals are limited.
          </div>
        ) : null}
      </div>
    </main>
  );
}
