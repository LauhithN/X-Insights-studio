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
    <div className="glass-card p-4">
      <div ref={cardRef} className="rounded-xl border border-white/10 bg-[#0b0f14] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate/80">Viral Insight</p>
            <h4 className="text-lg font-semibold text-white">{title}</h4>
            {subtitle ? <p className="text-xs text-slate/80">{subtitle}</p> : null}
          </div>
          <div className="pill">X Insights</div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
      <button
        onClick={handleExport}
        className="mt-4 w-full rounded-full border border-edge/60 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
        disabled={isExporting}
      >
        {isExporting ? "Exporting..." : "Export PNG"}
      </button>
    </div>
  );
}
