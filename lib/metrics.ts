import { ContentRow } from "./types";

export function engagementCount(row: ContentRow): number {
  return (
    (row.likes ?? 0) +
    (row.replies ?? 0) +
    (row.reposts ?? 0) +
    (row.bookmarks ?? 0) +
    (row.shares ?? 0)
  );
}

export function engagementRate(row: ContentRow): number {
  if (!row.impressions || row.impressions <= 0) return 0;
  return engagementCount(row) / row.impressions;
}

export function followsPer1k(row: ContentRow): number {
  if (!row.impressions || row.impressions <= 0) return 0;
  return ((row.newFollows ?? 0) / row.impressions) * 1000;
}

export function hourOf(row: ContentRow): number | null {
  if (!row.createdAt) return null;
  const date = new Date(row.createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCHours();
}

export function dayOf(row: ContentRow): number | null {
  if (!row.createdAt) return null;
  const date = new Date(row.createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCDay();
}

export function topBy<T>(rows: T[], metric: (row: T) => number, count: number): T[] {
  return [...rows]
    .map((row) => ({ row, score: metric(row) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((entry) => entry.row);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", options).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}
