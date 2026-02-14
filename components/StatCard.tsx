"use client";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="glass-card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/70 to-transparent"></div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-slate/85">{label}</p>
      <p className="font-data mt-2 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate/80">{hint}</p> : null}
    </div>
  );
}
