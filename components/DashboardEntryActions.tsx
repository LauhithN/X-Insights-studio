"use client";

import { useRouter } from "next/navigation";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export default function DashboardEntryActions() {
  const router = useRouter();
  const hasHydrated = useAnalyticsStore((state) => state.hasHydrated);
  const contentRows = useAnalyticsStore((state) => state.contentRows);

  const hasContent = contentRows.length > 0;
  const canOpenDashboard = hasHydrated && hasContent;

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => router.push("/dashboard")}
        disabled={!canOpenDashboard}
        className="rounded-full border border-edge/60 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon disabled:cursor-not-allowed disabled:opacity-40"
      >
        Go to dashboard
      </button>
      <button
        onClick={() => router.push("/dashboard")}
        disabled={!canOpenDashboard}
        className="text-left text-xs text-slate underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Already loaded data? Jump to dashboard
      </button>
      {!hasHydrated ? (
        <p className="text-xs text-slate">Checking saved data...</p>
      ) : !hasContent ? (
        <p className="text-xs text-slate">Upload a content CSV to unlock the dashboard.</p>
      ) : null}
    </div>
  );
}
