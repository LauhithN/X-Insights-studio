"use client";

import { useMemo, useState } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

type NavItem = {
  href: string;
  label: string;
};

const CORE_ITEMS: NavItem[] = [
  { href: "#overview", label: "Overview" },
  { href: "#top-tweets", label: "Top Tweets" },
  { href: "#engagement-vs-growth", label: "Engagement vs Growth" },
  { href: "#posting-time-heatmap", label: "Posting Time Heatmap" },
  { href: "#viral-cards", label: "Viral Cards" }
];

const OVERVIEW_ITEMS: NavItem[] = [
  { href: "#daily-trends", label: "Daily Trends" },
  { href: "#net-follower-growth", label: "Net Follower Growth" },
  { href: "#post-frequency-vs-growth", label: "Post Frequency vs Growth" },
  { href: "#profile-visit-funnel", label: "Profile Visit Funnel" },
  { href: "#engagement-mix", label: "Engagement Mix" },
  { href: "#efficiency-trend", label: "Efficiency Trend" },
  { href: "#viral-day-detector", label: "Viral Day Detector" },
  { href: "#streak-consistency", label: "Streak Consistency" }
];

export default function DashboardSidebar() {
  const overviewRowsCount = useAnalyticsStore((state) => state.overviewRows.length);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(() => {
    if (!overviewRowsCount) return CORE_ITEMS;
    return [...CORE_ITEMS, ...OVERVIEW_ITEMS];
  }, [overviewRowsCount]);

  const renderNav = (onNavigate?: () => void) => (
    <nav className="mt-4 space-y-1">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className="block rounded-lg border border-transparent px-3 py-2 text-sm text-slate transition hover:border-edge/70 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );

  return (
    <div className="mb-6 lg:mb-0 lg:w-72 lg:shrink-0">
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="glass-card inline-flex items-center gap-2 border-edge/70 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
        >
          Dashboard Sections
        </button>
      </div>

      <aside className="glass-card sticky top-6 hidden max-h-[calc(100vh-3rem)] overflow-auto border-edge/70 p-4 lg:block">
        <p className="pill inline-block">Navigation</p>
        <h2 className="mt-3 text-lg font-semibold text-white">Dashboard Sections</h2>
        <p className="mt-2 text-xs text-slate">Jump to any section with one click.</p>
        {renderNav()}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close dashboard navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <aside className="glass-card relative h-full w-80 max-w-[88vw] rounded-none border-r border-edge/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="pill inline-block">Navigation</p>
                <h2 className="mt-3 text-lg font-semibold text-white">Dashboard Sections</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-edge/70 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-xs text-slate">Tap a section to scroll to it.</p>
            {renderNav(() => setMobileOpen(false))}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
