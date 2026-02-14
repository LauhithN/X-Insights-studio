"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { OverviewRow } from "@/lib/types";
import { formatNumber } from "@/lib/metrics";

type DailyTrendsProps = {
  rows: OverviewRow[];
};

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

function toDateLabel(dateKey: string): string {
  const [yearText, monthText, dayText] = dateKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) {
    return dateKey;
  }
  return dateLabelFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

export default function DailyTrends({ rows }: DailyTrendsProps) {
  const data = useMemo(
    () =>
      [...rows]
        .filter((row) => row.date)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((row) => ({
          dateLabel: toDateLabel(row.date),
          impressions: row.impressions,
          newFollows: row.newFollows ?? 0,
          profileVisits: row.profileVisits ?? 0
        })),
    [rows]
  );

  if (!data.length) {
    return (
      <div className="glass-card p-6 text-sm text-slate">
        Overview CSV is empty or missing dates.
      </div>
    );
  }

  return (
    <div className="glass-card h-[360px] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="dateLabel" tick={{ fill: "#c8d5e2" }} />
          <YAxis tick={{ fill: "#c8d5e2" }} />
          <Tooltip
            contentStyle={{
              background: "#0b0f14",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12
            }}
            formatter={(value: number, name: string) => [formatNumber(value), name]}
          />
          <Line
            type="monotone"
            dataKey="impressions"
            name="Impressions"
            stroke="#6ef3c5"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="newFollows"
            name="New follows"
            stroke="#ff7a59"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="profileVisits"
            name="Profile visits"
            stroke="#c8d5e2"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
