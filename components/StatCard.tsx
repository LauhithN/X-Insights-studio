"use client";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="glass-card flex flex-col gap-2 p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate/80">{label}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="text-xs text-slate/80">{hint}</p> : null}
    </div>
  );
}
