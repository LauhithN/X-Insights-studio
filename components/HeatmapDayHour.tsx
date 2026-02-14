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
  if (max <= 0) return "rgba(255,255,255,0.06)";
  const intensity = Math.min(value / max, 1);
  const alpha = 0.12 + intensity * 0.6;
  return `rgba(110, 243, 197, ${alpha.toFixed(2)})`;
}

function formatTooltip(dayLabel: string, hourIndex: number, value: number, count: number, metric: MetricType): string {
  const base = `${dayLabel} ${hourIndex.toString().padStart(2, "0")}:00 UTC`;
  if (metric === "followsPer1k") {
    return `${base} - ${value.toFixed(2)} follows / 1k from ${count} post(s)`;
  }
  if (metric === "engagementRate") {
    return `${base} - ${(value * 100).toFixed(2)}% engagement rate from ${count} post(s)`;
  }
  return `${base} - ${count} post(s)`;
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
      row.map((cell) => {
        const value = metric === "frequency" ? cell.count : cell.count ? cell.sum / cell.count : 0;
        return {
          value,
          count: cell.count
        };
      })
    );

    const max = Math.max(0, ...computed.flat().map((cell) => cell.value));

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
      <div className={variant === "card" ? "glass-card p-6 text-sm text-slate" : "text-xs text-slate"}>
        Upload content data with timestamps to see posting time heatmap.
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
            <div className="h-2 w-16 rounded-full bg-gradient-to-r from-white/10 to-neon"></div>
            <span>High</span>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "80px repeat(24, minmax(14px, 1fr))" }}
        >
          <div></div>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={`hour-${hour}`} className="text-[9px] text-slate">
              {hour % 4 === 0 ? hour.toString().padStart(2, "0") : ""}
            </div>
          ))}
          {days.map((dayLabel, dayIndex) => (
            <div key={dayLabel} className="contents">
              <div className="text-[10px] text-slate">{dayLabel}</div>
              {grid[dayIndex].map((cell, hourIndex) => {
                const tooltip = formatTooltip(dayLabel, hourIndex, cell.value, cell.count, metric);
                return (
                  <div
                    key={`${dayLabel}-${hourIndex}`}
                    className={variant === "card" ? "h-6 rounded-sm border border-white/5" : "h-4 rounded-sm border border-white/5"}
                    style={{ backgroundColor: colorFor(cell.value, maxValue) }}
                    title={tooltip}
                    aria-label={tooltip}
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

  return <div className="glass-card p-5">{gridContent}</div>;
}
