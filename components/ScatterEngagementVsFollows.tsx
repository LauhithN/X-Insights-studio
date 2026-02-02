"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ContentRow } from "@/lib/types";
import { engagementCount } from "@/lib/metrics";

type ScatterEngagementVsFollowsProps = {
  rows: ContentRow[];
  variant?: "card" | "plain";
  height?: number;
};

export default function ScatterEngagementVsFollows({
  rows,
  variant = "card",
  height = 360
}: ScatterEngagementVsFollowsProps) {
  const data = rows
    .map((row) => ({
      engagements: engagementCount(row),
      newFollows: row.newFollows,
      text: row.text
    }))
    .filter((point) => point.engagements > 0 || point.newFollows > 0);

  if (!data.length) {
    return (
      <div className={variant === "card" ? "glass-card p-6 text-sm text-slate" : "text-xs text-slate"}>
        Engagement vs growth scatter needs engagement and new follow data.
      </div>
    );
  }

  const chart = (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="engagements" name="Engagements" tick={{ fill: "#9fb1c1" }} />
        <YAxis dataKey="newFollows" name="New follows" tick={{ fill: "#9fb1c1" }} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{
            background: "#0b0f14",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12
          }}
          labelFormatter={() => ""}
          formatter={(value: number, name: string) => [value, name]}
        />
        <Scatter data={data} fill="#6ef3c5" />
      </ScatterChart>
    </ResponsiveContainer>
  );

  if (variant === "plain") {
    return <div style={{ height }}>{chart}</div>;
  }

  return (
    <div className="glass-card p-4" style={{ height }}>
      {chart}
    </div>
  );
}
