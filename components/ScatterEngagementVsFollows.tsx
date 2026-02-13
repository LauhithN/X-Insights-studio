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
      <div className={variant === "card" ? "glass-card p-6 text-sm text-slate/90" : "text-xs text-slate/90"}>
        Engagement vs growth scatter needs engagement and new follow data.
      </div>
    );
  }

  const chart = (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart>
        <CartesianGrid stroke="rgba(245, 229, 204, 0.09)" />
        <XAxis
          dataKey="engagements"
          name="Engagements"
          tick={{ fill: "#c7b291", fontSize: 11 }}
          axisLine={{ stroke: "rgba(247, 224, 188, 0.35)" }}
          tickLine={{ stroke: "rgba(247, 224, 188, 0.35)" }}
        />
        <YAxis
          dataKey="newFollows"
          name="New follows"
          tick={{ fill: "#c7b291", fontSize: 11 }}
          axisLine={{ stroke: "rgba(247, 224, 188, 0.35)" }}
          tickLine={{ stroke: "rgba(247, 224, 188, 0.35)" }}
        />
        <Tooltip
          cursor={{ stroke: "rgba(215, 255, 112, 0.4)", strokeDasharray: "4 4" }}
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null;
            const point = payload[0]?.payload as { engagements: number; newFollows: number; text: string };

            return (
              <div className="max-w-[280px] rounded-xl border border-edge/80 bg-ink/95 p-3 text-xs text-slate shadow-lift">
                <p className="font-semibold text-white">Engagement vs follows</p>
                <p className="mt-2 text-slate/85">Engagements: {point.engagements}</p>
                <p className="text-slate/85">New follows: {point.newFollows}</p>
                {point.text ? <p className="mt-2 text-slate/80">{point.text}</p> : null}
              </div>
            );
          }}
        />
        <Scatter data={data} fill="#d7ff70" fillOpacity={0.86} />
      </ScatterChart>
    </ResponsiveContainer>
  );

  if (variant === "plain") {
    return <div style={{ height }}>{chart}</div>;
  }

  return (
    <div className="glass-card p-4 sm:p-5" style={{ height }}>
      {chart}
    </div>
  );
}
