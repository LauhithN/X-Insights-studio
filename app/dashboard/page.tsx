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
    if (hasHydrated && !contentRows.length) {
      router.replace("/");
    }
  }, [contentRows.length, hasHydrated, router]);

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
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="glass-card p-6 text-sm text-slate">Loading saved analytics...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="fade-in-up flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="pill">Dashboard</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">X Insights Studio</h2>
            <p className="mt-2 text-sm text-slate">
              Content file: <span className="text-white">{contentFileName || "(loaded)"}</span>
              {overviewFileName ? (
                <span className="text-slate"> - Overview file: {overviewFileName}</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-full border border-edge/60 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
            >
              Upload new CSV
            </button>
            <button
              onClick={() => {
                clear();
                router.push("/");
              }}
              className="rounded-full border border-ember/40 bg-ember/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
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
              <p className="text-xs text-slate">New follows column missing. Upload a richer CSV for this ranking.</p>
            ) : null}
          </div>
          {hasFollowsColumn ? (
            <TopPostsTable rows={contentRows} />
          ) : (
            <div className="glass-card p-6 text-sm text-slate">
              Follows per 1k impressions requires a &quot;New follows&quot; column.
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Engagement != Growth</h3>
            {hasFollowsColumn || hasEngagementColumn ? (
              <ScatterEngagementVsFollows rows={contentRows} />
            ) : (
              <div className="glass-card p-6 text-sm text-slate">
                This chart needs engagement columns and/or new follows.
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Posting Time Heatmap</h3>
            <HeatmapDayHour rows={contentRows} metric={heatmapMetric} />
            <p className="text-xs text-slate">Time buckets are calculated in UTC.</p>
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
                      <p className="text-xs text-slate">#{index + 1}</p>
                      <p className="text-sm text-white">{row.text}</p>
                      <p className="mt-2 text-xs text-neon">
                        {followsPer1k(row).toFixed(2)} follows / 1k impressions
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate">Need follows + impressions to rank top conversion posts.</p>
              )}
            </ViralCard>

            <ViralCard title="Engagement != Growth" subtitle="High engagement posts with weaker follow conversion">
              {mismatchInsights.length ? (
                <div className="space-y-3">
                  {mismatchInsights.map((item, index) => (
                    <div key={`${item.row.id ?? index}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-slate">#{index + 1}</p>
                      <p className="text-sm text-white">{item.row.text || "(No text)"}</p>
                      <p className="mt-2 text-xs text-slate">
                        {formatNumber(item.engagements)} engagements, {formatNumber(item.follows)} follows
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate">Upload engagement + follows data to generate this insight.</p>
              )}
            </ViralCard>

            <ViralCard title="Best posting windows" subtitle="Top performance windows by day/hour (UTC)">
              {bestTimeInsights.length ? (
                <div className="space-y-3">
                  {bestTimeInsights.map((slot, index) => (
                    <div key={`${slot.day}-${slot.hour}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-slate">#{index + 1}</p>
                      <p className="text-sm text-white">
                        {dayLabels[slot.day]} {slot.hour.toString().padStart(2, "0")}:00 UTC
                      </p>
                      <p className="mt-2 text-xs text-neon">
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
                <p className="text-xs text-slate">Need valid timestamps to compute best posting windows.</p>
              )}
            </ViralCard>
          </div>
        </section>

        {overviewRows.length ? (
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Daily Trends</h3>
            <DailyTrends rows={overviewRows} />
          </section>
        ) : null}

        {!scatterData.length ? (
          <div className="glass-card p-5 text-sm text-slate">
            Engagement and follow columns are sparse in this dataset; some growth visuals are limited.
          </div>
        ) : null}
      </div>
    </main>
  );
}
