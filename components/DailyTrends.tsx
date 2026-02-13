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
    return <div className="glass-card p-6 text-sm text-slate/90">Overview CSV is empty or missing dates.</div>;
  }

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate/85">
        <span className="soft-chip">
          <span className="mr-2 h-2 w-2 rounded-full bg-neon"></span>
          Impressions
        </span>
        <span className="soft-chip">
          <span className="mr-2 h-2 w-2 rounded-full bg-ember"></span>
          New follows
        </span>
        <span className="soft-chip">
          <span className="mr-2 h-2 w-2 rounded-full bg-sand"></span>
          Profile visits
        </span>
      </div>

      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(245, 229, 204, 0.08)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "#c7b291", fontSize: 11 }}
              axisLine={{ stroke: "rgba(247, 224, 188, 0.35)" }}
              tickLine={{ stroke: "rgba(247, 224, 188, 0.35)" }}
            />
            <YAxis
              tick={{ fill: "#c7b291", fontSize: 11 }}
              axisLine={{ stroke: "rgba(247, 224, 188, 0.35)" }}
              tickLine={{ stroke: "rgba(247, 224, 188, 0.35)" }}
            />
            <Tooltip
              contentStyle={{
                background: "#120f0b",
                border: "1px solid rgba(247, 224, 188, 0.3)",
                borderRadius: 12,
                color: "#f5ead5"
              }}
              formatter={(value: number, name: string) => [formatNumber(value), name]}
            />
            <Line
              type="monotone"
              dataKey="impressions"
              name="Impressions"
              stroke="#d7ff70"
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="newFollows"
              name="New follows"
              stroke="#ff8652"
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="profileVisits"
              name="Profile visits"
              stroke="#f5ead5"
              strokeWidth={2}
              strokeOpacity={0.85}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
