"use client";

import { useMemo, useState, useEffect } from "react";
import { OverviewRow } from "@/lib/types";

type ProfileVisitFunnelProps = {
  rows: OverviewRow[];
};

const fmt = new Intl.NumberFormat("en-US");

function conversionColor(rate: number): string {
  if (rate > 1) return "text-neon";
  if (rate < 0.5) return "text-ember";
  return "text-slate";
}

export default function ProfileVisitFunnel({ rows }: ProfileVisitFunnelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay so the CSS transition plays visibly after initial render
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { impressions, profileVisits, newFollows } = useMemo(() => {
    let imp = 0;
    let pv = 0;
    let nf = 0;
    for (const row of rows) {
      imp += row.impressions ?? 0;
      pv += row.profileVisits ?? 0;
      nf += row.newFollows ?? 0;
    }
    return { impressions: imp, profileVisits: pv, newFollows: nf };
  }, [rows]);

  const impToVisitRate = impressions > 0 ? (profileVisits / impressions) * 100 : 0;
  const visitToFollowRate = profileVisits > 0 ? (newFollows / profileVisits) * 100 : 0;

  const visitsPer1k = impressions > 0 ? (profileVisits / impressions) * 1000 : 0;
  const followsPer1k = impressions > 0 ? (newFollows / impressions) * 1000 : 0;

  // Bar widths proportional to impressions, with min 8%
  const visitWidth = impressions > 0 ? Math.max(8, (profileVisits / impressions) * 100) : 8;
  const followWidth = impressions > 0 ? Math.max(8, (newFollows / impressions) * 100) : 8;

  if (!rows.length || impressions === 0) {
    return (
      <div className="glass-card p-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="pill">Conversion</span>
          <h3 className="text-lg font-semibold text-white">The Growth Funnel</h3>
        </div>
        <p className="text-sm text-slate">
          No impression data available. Upload your Overview CSV to see the conversion funnel.
        </p>
      </div>
    );
  }

  const stages: {
    label: string;
    value: number;
    width: number;
    bgClass: string;
    borderColor: string;
    glowColor: string;
  }[] = [
    {
      label: "Impressions",
      value: impressions,
      width: 100,
      bgClass: "bg-gradient-to-r from-[#6ef3c5]/20 to-[#6ef3c5]/40",
      borderColor: "border-l-[#6ef3c5]",
      glowColor: "rgba(110, 243, 197, 0.12)",
    },
    {
      label: "Profile Visits",
      value: profileVisits,
      width: visitWidth,
      bgClass: "bg-[#38bdf8]/30",
      borderColor: "border-l-[#38bdf8]",
      glowColor: "rgba(56, 189, 248, 0.10)",
    },
    {
      label: "New Follows",
      value: newFollows,
      width: followWidth,
      bgClass: "bg-[#a78bfa]/30",
      borderColor: "border-l-[#a78bfa]",
      glowColor: "rgba(167, 139, 250, 0.10)",
    },
  ];

  const conversions: {
    from: string;
    to: string;
    rate: number;
  }[] = [
    { from: "Impressions", to: "Profile Visits", rate: impToVisitRate },
    { from: "Profile Visits", to: "Follows", rate: visitToFollowRate },
  ];

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <span className="pill">Conversion</span>
        <h3 className="text-lg font-semibold text-white">The Growth Funnel</h3>
      </div>

      {/* Funnel */}
      <div className="flex flex-col items-center gap-0">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex w-full flex-col items-center">
            {/* Funnel bar */}
            <div
              className="flex items-center justify-center"
              style={{ width: "100%" }}
            >
              <div
                className={`
                  relative flex h-14 items-center justify-between
                  rounded-xl border-l-[3px] ${stage.borderColor}
                  ${stage.bgClass}
                  border border-white/[0.07]
                  px-4
                  transition-all duration-700 ease-out
                `}
                style={{
                  width: mounted ? `${stage.width}%` : "0%",
                  transitionDelay: `${i * 120}ms`,
                  boxShadow: `0 0 20px ${stage.glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                  minWidth: mounted ? "fit-content" : undefined,
                }}
              >
                <span className="whitespace-nowrap text-sm font-medium text-white/90">
                  {stage.label}
                </span>
                <span className="ml-4 whitespace-nowrap text-sm font-semibold tabular-nums text-white">
                  {fmt.format(stage.value)}
                </span>
              </div>
            </div>

            {/* Conversion arrow between stages */}
            {i < conversions.length && (
              <div className="flex flex-col items-center py-2">
                {/* Thin connecting line */}
                <div className="h-3 w-px bg-gradient-to-b from-white/20 to-white/5" />

                {/* Arrow and rate */}
                <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="shrink-0 opacity-50"
                  >
                    <path
                      d="M6 2v8m0 0L3 7m3 3l3-3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="whitespace-nowrap text-[11px] text-slate/70">
                    {conversions[i].from} → {conversions[i].to}:
                  </span>
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${conversionColor(conversions[i].rate)}`}
                  >
                    {conversions[i].rate.toFixed(2)}%
                  </span>
                </div>

                {/* Thin connecting line */}
                <div className="h-3 w-px bg-gradient-to-b from-white/5 to-white/20" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Insight line */}
      <div className="mt-5 border-t border-white/[0.06] pt-4 text-center">
        <p className="text-xs text-slate">
          For every 1,000 impressions, you get{" "}
          <span className="font-medium text-white/80">
            {visitsPer1k.toFixed(1)} profile visits
          </span>{" "}
          and{" "}
          <span className="font-medium text-white/80">
            {followsPer1k.toFixed(1)} new followers
          </span>
          .
        </p>
      </div>
    </div>
  );
}
