"use client";

import { useMemo } from "react";
import { OverviewRow } from "@/lib/types";
import { formatNumber } from "@/lib/metrics";

type ViralDayDetectorProps = {
  rows: OverviewRow[];
};

/* ── helpers ─────────────────────────────────────────────────────────── */

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return fullDateFormatter.format(new Date(Date.UTC(y, m - 1, d)));
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return "-";
  return formatNumber(n);
}

/* ── metric cell ─────────────────────────────────────────────────────── */

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate/70">
        {label}
      </span>
      <span className="text-base font-semibold text-white">{value}</span>
    </div>
  );
}

/* ── component ───────────────────────────────────────────────────────── */

type ViralDay = {
  row: OverviewRow;
  multiplier: number;
};

export default function ViralDayDetector({ rows }: ViralDayDetectorProps) {
  const { viralDays, median, maxImpressions } = useMemo(() => {
    const validRows = rows.filter((r) => r.date && r.impressions >= 0);
    if (validRows.length === 0) {
      return { viralDays: [] as ViralDay[], median: 0, maxImpressions: 0 };
    }

    const impressions = validRows.map((r) => r.impressions);
    const med = computeMedian(impressions);

    // Guard: if median is 0 every day with impressions > 0 would be "infinite x".
    // In that edge case, fall back to requiring >= 5x the mean instead.
    const threshold = med > 0 ? med * 5 : Infinity;

    const detected: ViralDay[] = validRows
      .filter((r) => r.impressions >= threshold)
      .map((r) => ({
        row: r,
        multiplier: med > 0 ? Math.round(r.impressions / med) : 0,
      }))
      .sort((a, b) => b.row.impressions - a.row.impressions)
      .slice(0, 5);

    const maxImp =
      detected.length > 0
        ? detected[0].row.impressions
        : 0;

    return { viralDays: detected, median: med, maxImpressions: maxImp };
  }, [rows]);

  const hasViralDays = viralDays.length > 0;

  return (
    <section className="glass-card p-6 sm:p-8">
      {/* ── header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <span className="pill mb-3 inline-block">VIRAL EVENTS</span>
        <h3 className="text-xl font-semibold text-white sm:text-2xl">
          Viral Day Detector
        </h3>
      </div>

      {/* ── summary ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        {hasViralDays ? (
          <>
            <p className="text-sm text-slate">
              <span className="font-semibold text-neon">
                {viralDays.length}
              </span>{" "}
              viral event{viralDays.length !== 1 ? "s" : ""} detected in your
              data
            </p>
            <p className="mt-1 text-sm text-slate/80">
              Your median day:{" "}
              <span className="font-medium text-white">
                {fmt(median)}
              </span>{" "}
              impressions. These days broke through:
            </p>
          </>
        ) : (
          <p className="text-sm text-slate">
            No viral spikes detected yet. Your median daily impressions:{" "}
            <span className="font-medium text-white">{fmt(median)}</span>. Keep
            pushing.
          </p>
        )}
      </div>

      {/* ── viral day cards ─────────────────────────────────────────── */}
      {hasViralDays && (
        <div className="flex flex-col gap-4">
          {viralDays.map(({ row, multiplier }, index) => {
            const barPercent =
              maxImpressions > 0
                ? (row.impressions / maxImpressions) * 100
                : 0;

            return (
              <div
                key={row.date}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-mist/90 border-l-4 border-l-neon"
                style={{
                  boxShadow: "0 0 20px rgba(110,243,197,0.15)",
                  backdropFilter: "blur(20px)",
                  animation: `fadeInUp 540ms ease-out ${index * 120}ms both`,
                }}
              >
                {/* Top glow line */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/40 to-transparent" />

                <div className="p-5 sm:p-6">
                  {/* ── date + multiplier badge ────────────────────── */}
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-base font-semibold text-white sm:text-lg">
                      {formatDate(row.date)}
                    </h4>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{
                        background: "rgba(110,243,197,0.15)",
                        color: "#6ef3c5",
                        boxShadow: "0 0 12px rgba(110,243,197,0.25)",
                      }}
                    >
                      {multiplier}x your median
                    </span>
                  </div>

                  {/* ── metrics grid ───────────────────────────────── */}
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                    <MetricCell
                      label="Impressions"
                      value={fmt(row.impressions)}
                    />
                    <MetricCell
                      label="Engagements"
                      value={fmt(row.engagements)}
                    />
                    <MetricCell
                      label="Profile Visits"
                      value={fmt(row.profileVisits)}
                    />
                    <MetricCell
                      label="New Follows"
                      value={fmt(row.newFollows)}
                    />
                  </div>

                  {/* ── sparkline comparison bar ───────────────────── */}
                  <div className="mt-5">
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-slate/60">
                      <span>Relative reach</span>
                      <span>{Math.round(barPercent)}% of peak</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${barPercent}%`,
                          background:
                            "linear-gradient(90deg, #6ef3c5 0%, rgba(110,243,197,0.5) 100%)",
                          boxShadow: "0 0 10px rgba(110,243,197,0.4)",
                          transition: "width 700ms cubic-bezier(0.22, 1, 0.36, 1)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
