"use client";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="text-[11px] font-medium text-slate/60">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate/50">{hint}</p> : null}
    </div>
  );
}
