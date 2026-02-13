"use client";

import { useMemo } from "react";
import { ContentRow } from "@/lib/types";
import { dayOf, engagementRate, followsPer1k, hourOf } from "@/lib/metrics";

type MetricType = "followsPer1k" | "engagementRate" | "frequency";

type HeatmapDayHourProps = {
  rows: ContentRow[];
  metric: MetricType;
  variant?: "card" | "plain";
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function colorFor(value: number, max: number): string {
  if (max <= 0) return "rgba(245, 229, 204, 0.08)";
  const intensity = Math.min(value / max, 1);
  const hue = 20 + intensity * 58;
  const lightness = 16 + intensity * 36;
  return `hsl(${hue} 86% ${lightness}%)`;
}

export default function HeatmapDayHour({ rows, metric, variant = "card" }: HeatmapDayHourProps) {
  const { grid, maxValue, metricLabel } = useMemo(() => {
    const gridData = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
    );

    rows.forEach((row) => {
      const day = dayOf(row);
      const hour = hourOf(row);
      if (day === null || hour === null) return;

      let value = 1;
      if (metric === "followsPer1k") value = followsPer1k(row);
      if (metric === "engagementRate") value = engagementRate(row);

      gridData[day][hour].sum += value;
      gridData[day][hour].count += 1;
    });

    const computed = gridData.map((row) =>
      row.map((cell) => ({
        value: metric === "frequency" ? cell.count : cell.count ? cell.sum / cell.count : 0,
        count: cell.count
      }))
    );

    const max = Math.max(
      0,
      ...computed.flat().map((cell) => (metric === "frequency" ? cell.count : cell.value))
    );

    const label =
      metric === "followsPer1k"
        ? "Follows per 1k impressions"
        : metric === "engagementRate"
          ? "Engagement rate"
          : "Posting volume";

    return { grid: computed, maxValue: max, metricLabel: label };
  }, [rows, metric]);

  if (!rows.length) {
    return (
      <div className={variant === "card" ? "glass-card p-6 text-sm text-slate/90" : "text-xs text-slate/90"}>
        Upload content data with timestamps to see posting-time heatmap.
      </div>
    );
  }

  const gridContent = (
    <div className={variant === "card" ? "space-y-4" : "space-y-2"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={variant === "card" ? "text-sm font-semibold text-white" : "text-xs font-semibold text-white"}>
          {metricLabel}
        </p>
        {variant === "card" ? (
          <div className="flex items-center gap-2 text-xs text-slate">
            <span>Low</span>
            <div className="h-2 w-20 rounded-full bg-gradient-to-r from-ember/50 via-amber-300/60 to-neon"></div>
            <span>High</span>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: "80px repeat(24, minmax(14px, 1fr))" }}>
          <div></div>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={`hour-${hour}`} className="text-[9px] text-slate/85">
              {hour % 3 === 0 ? hour.toString().padStart(2, "0") : ""}
            </div>
          ))}
          {days.map((dayLabel, dayIndex) => (
            <div key={dayLabel} className="contents">
              <div className="text-[10px] text-slate/85">{dayLabel}</div>
              {grid[dayIndex].map((cell, hourIndex) => {
                const metricText =
                  metric === "frequency"
                    ? `${cell.count} posts`
                    : `${cell.value.toFixed(2)} ${metricLabel.toLowerCase()} (${cell.count} posts)`;

                return (
                  <div
                    key={`${dayLabel}-${hourIndex}`}
                    className={
                      variant === "card"
                        ? "h-6 rounded-sm border border-edge/40"
                        : "h-4 rounded-sm border border-edge/40"
                    }
                    style={{ backgroundColor: colorFor(cell.value, maxValue) }}
                    title={`${dayLabel} ${hourIndex}:00 - ${metricText}`}
                  ></div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (variant === "plain") return gridContent;

  return <div className="glass-card p-5 sm:p-6">{gridContent}</div>;
}
