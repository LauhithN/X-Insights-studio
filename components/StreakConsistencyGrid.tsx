"use client";

import { useMemo } from "react";
import { OverviewRow } from "@/lib/types";

type StreakConsistencyGridProps = {
  rows: OverviewRow[];
};

/* ------------------------------------------------------------------ */
/*  Date helpers — all UTC to avoid timezone shifting                  */
/* ------------------------------------------------------------------ */

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

const tooltipDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const monthLabelFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

/* ------------------------------------------------------------------ */
/*  Cell colour by createPost count                                    */
/* ------------------------------------------------------------------ */

function cellColor(posts: number): string {
  if (posts === 0) return "rgba(255,255,255,0.04)";
  if (posts === 1) return "rgba(110,243,197,0.2)";
  if (posts === 2) return "rgba(110,243,197,0.4)";
  return "rgba(110,243,197,0.7)";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function StreakConsistencyGrid({ rows }: StreakConsistencyGridProps) {
  const {
    weeks,
    monthLabels,
    currentStreak,
    longestStreak,
    activeDays,
    totalDays,
    consistency,
  } = useMemo(() => {
    if (!rows.length) {
      return {
        weeks: [] as { key: string; posts: number; follows: number; dow: number }[][],
        monthLabels: [] as { label: string; col: number }[],
        currentStreak: 0,
        longestStreak: 0,
        activeDays: 0,
        totalDays: 0,
        consistency: 0,
      };
    }

    /* --- Build lookup map ------------------------------------------------ */
    const lookup = new Map<string, OverviewRow>();
    rows.forEach((r) => {
      if (r.date) lookup.set(r.date, r);
    });

    /* --- Date range ------------------------------------------------------- */
    const sortedDates = [...lookup.keys()].sort();
    const minDate = parseDate(sortedDates[0]);
    const maxDate = parseDate(sortedDates[sortedDates.length - 1]);

    /* Expand range so it starts on Sunday and ends on Saturday */
    const startDate = addDays(minDate, -minDate.getUTCDay()); // back to Sunday
    const endDate = addDays(maxDate, 6 - maxDate.getUTCDay()); // forward to Saturday

    /* --- Build flat day list & compute weeks ------------------------------ */
    const allDays: { key: string; posts: number; follows: number; dow: number; date: Date }[] = [];
    let cursor = new Date(startDate);
    while (cursor <= endDate) {
      const k = dateKey(cursor);
      const row = lookup.get(k);
      allDays.push({
        key: k,
        posts: row?.createPost ?? 0,
        follows: row?.newFollows ?? 0,
        dow: cursor.getUTCDay(),
        date: new Date(cursor),
      });
      cursor = addDays(cursor, 1);
    }

    /* Group into weeks (each week = 7 entries, Sun-Sat) */
    const weekList: typeof allDays[] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weekList.push(allDays.slice(i, i + 7));
    }

    /* --- Month labels at the top of columns -------------------------------- */
    const labels: { label: string; col: number }[] = [];
    let prevMonth = -1;
    weekList.forEach((week, colIdx) => {
      /* Use the first day of the week that falls on or after the 1st */
      const sunday = week[0];
      const month = sunday.date.getUTCMonth();
      if (month !== prevMonth) {
        labels.push({
          label: monthLabelFmt.format(sunday.date),
          col: colIdx,
        });
        prevMonth = month;
      }
    });

    /* --- Streak computation (over the *actual* data range, not padding) ---- */
    const rangeDays: { key: string; posts: number }[] = [];
    let rc = new Date(minDate);
    while (rc <= maxDate) {
      const k = dateKey(rc);
      const row = lookup.get(k);
      rangeDays.push({ key: k, posts: row?.createPost ?? 0 });
      rc = addDays(rc, 1);
    }

    let curStreak = 0;
    for (let i = rangeDays.length - 1; i >= 0; i--) {
      if (rangeDays[i].posts >= 1) curStreak++;
      else break;
    }

    let longStreak = 0;
    let runLength = 0;
    for (let i = 0; i < rangeDays.length; i++) {
      if (rangeDays[i].posts >= 1) {
        runLength++;
        if (runLength > longStreak) longStreak = runLength;
      } else {
        runLength = 0;
      }
    }

    const active = rangeDays.filter((d) => d.posts >= 1).length;
    const total = rangeDays.length;
    const pct = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      weeks: weekList,
      monthLabels: labels,
      currentStreak: curStreak,
      longestStreak: longStreak,
      activeDays: active,
      totalDays: total,
      consistency: pct,
    };
  }, [rows]);

  /* ---- Empty state ----------------------------------------------------- */
  if (!rows.length) {
    return (
      <div className="glass-card p-6 text-sm text-slate">
        Upload overview data to see your posting streak and consistency grid.
      </div>
    );
  }

  /* ---- Consistency colour ---------------------------------------------- */
  const consistencyColor =
    consistency > 60 ? "text-neon" : consistency < 30 ? "text-ember" : "text-slate";

  /* ---- Day-of-week row labels (GitHub style: show Mon, Wed, Fri) ------- */
  const rowLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="glass-card p-5 space-y-5">
      {/* Top neon accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/70 to-transparent rounded-t-2xl" />

      {/* Section header */}
      <div className="space-y-1">
        <div className="pill inline-block">Consistency</div>
        <h3 className="text-lg font-semibold text-white">Posting Streak &amp; Consistency</h3>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-3">
        <StatPill
          label="Current streak"
          value={`${currentStreak} day${currentStreak !== 1 ? "s" : ""}`}
          valueClass={currentStreak > 0 ? "text-neon" : "text-slate"}
        />
        <StatPill
          label="Longest streak"
          value={`${longestStreak} day${longestStreak !== 1 ? "s" : ""}`}
          valueClass="text-neon"
        />
        <StatPill
          label="Active days"
          value={
            <span>
              <span className="text-neon">{activeDays}</span>
              <span className="text-slate/60"> / {totalDays}</span>
            </span>
          }
        />
        <StatPill
          label="Consistency"
          value={`${consistency}%`}
          valueClass={consistencyColor}
        />
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-0">
          {/* Month labels row */}
          <div className="flex" style={{ paddingLeft: 32 }}>
            {weeks.map((_, colIdx) => {
              const label = monthLabels.find((m) => m.col === colIdx);
              return (
                <div
                  key={`month-${colIdx}`}
                  className="text-[9px] text-slate/70 leading-none"
                  style={{ width: 16, minWidth: 16 }}
                >
                  {label ? label.label : ""}
                </div>
              );
            })}
          </div>

          {/* 7 rows x N columns */}
          <div className="flex gap-0">
            {/* Row labels */}
            <div
              className="flex flex-col justify-between"
              style={{ width: 32, minWidth: 32 }}
            >
              {rowLabels.map((label, i) => (
                <div
                  key={`rl-${i}`}
                  className="flex items-center text-[9px] text-slate/60 leading-none"
                  style={{ height: 16 }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Columns (weeks) */}
            <div className="flex gap-[3px]">
              {weeks.map((week, colIdx) => (
                <div key={`week-${colIdx}`} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    const prettyDate = tooltipDateFmt.format(parseDate(day.key));
                    const postLabel = day.posts === 1 ? "1 post" : `${day.posts} posts`;
                    const followLabel =
                      day.follows === 1
                        ? "1 follow gained"
                        : `${day.follows} follows gained`;
                    const tip = `${prettyDate}\n${postLabel}\n${followLabel}`;
                    return (
                      <div
                        key={day.key}
                        className="h-[13px] w-[13px] rounded-sm transition-colors duration-150"
                        style={{
                          backgroundColor: cellColor(day.posts),
                          outline: "1px solid rgba(255,255,255,0.03)",
                        }}
                        title={tip}
                        aria-label={tip}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-slate/70">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <LegendSwatch color={cellColor(0)} label="No posts" />
          <LegendSwatch color={cellColor(1)} label="1 post" />
          <LegendSwatch color={cellColor(2)} label="2 posts" />
          <LegendSwatch color={cellColor(3)} label="3+ posts" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small sub-components                                               */
/* ------------------------------------------------------------------ */

function StatPill({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate/70">{label}:</span>
      <span className={`text-sm font-semibold ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div
      className="h-[11px] w-[11px] rounded-sm"
      style={{ backgroundColor: color, outline: "1px solid rgba(255,255,255,0.03)" }}
      title={label}
      aria-label={label}
    />
  );
}
