"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";

type ViralCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  fileName?: string;
};

export default function ViralCard({ title, subtitle, children, fileName }: ViralCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = fileName ?? "x-insights-card.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div ref={cardRef} className="rounded-xl border border-white/[0.06] bg-[#0b0f14] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate/50">Viral Insight</p>
            <h4 className="text-sm font-medium text-white/85">{title}</h4>
            {subtitle ? <p className="text-xs text-slate/50">{subtitle}</p> : null}
          </div>
          <div className="inline-flex items-center rounded-md border-l-2 border-neon/60 bg-white/[0.03] px-2 py-1 text-xs text-slate/70">X Insights</div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
      <button
        onClick={handleExport}
        className="mt-4 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
        disabled={isExporting}
        aria-busy={isExporting}
      >
        {isExporting ? "Exporting..." : "Export PNG"}
      </button>
    </div>
  );
}
