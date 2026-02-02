"use client";

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

export default function DailyTrends({ rows }: DailyTrendsProps) {
  const data = [...rows]
    .filter((row) => row.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((row) => ({
      dateLabel: new Date(row.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      }),
      impressions: row.impressions,
      newFollows: row.newFollows,
      profileVisits: row.profileVisits
    }));

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
          <XAxis dataKey="dateLabel" tick={{ fill: "#9fb1c1" }} />
          <YAxis tick={{ fill: "#9fb1c1" }} />
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
            stroke="#9fb1c1"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
