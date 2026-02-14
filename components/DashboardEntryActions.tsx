"use client";

import { useRouter } from "next/navigation";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export default function DashboardEntryActions() {
  const router = useRouter();
  const hasHydrated = useAnalyticsStore((state) => state.hasHydrated);
  const contentRows = useAnalyticsStore((state) => state.contentRows);
  const overviewRows = useAnalyticsStore((state) => state.overviewRows);

  const hasData = contentRows.length > 0 || overviewRows.length > 0;
  const canOpenDashboard = hasHydrated && hasData;

  if (!hasHydrated) {
    return <p className="text-xs text-slate/50">Checking saved data...</p>;
  }

  if (!hasData) {
    return (
      <p className="text-xs text-slate/50">
        Upload a CSV to unlock the dashboard.
      </p>
    );
  }

  return (
    <button
      onClick={() => router.push("/dashboard")}
      disabled={!canOpenDashboard}
      className="w-full rounded-lg border border-neon/20 bg-neon/[0.06] px-4 py-2 text-sm font-medium text-neon/90 transition-colors hover:bg-neon/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon/50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Open dashboard
    </button>
  );
}
