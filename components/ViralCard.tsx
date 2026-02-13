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
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#120f0b"
      });
      const link = document.createElement("a");
      link.download = fileName ?? "x-insights-card.png";
      link.href = dataUrl;
      link.click();
    } catch {
      setExportError("Export failed. Try again after chart rendering finishes.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="glass-card p-4 sm:p-5">
      <div ref={cardRef} className="rounded-2xl border border-edge/70 bg-ink/95 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate/80">Viral Insight</p>
            <h4 className="mt-1 text-lg font-semibold text-white">{title}</h4>
            {subtitle ? <p className="text-xs text-slate/80">{subtitle}</p> : null}
          </div>
          <div className="pill">X Insights</div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
      <button onClick={handleExport} className="btn-secondary mt-4 w-full" disabled={isExporting}>
        {isExporting ? "Exporting..." : "Export PNG"}
      </button>
      {exportError ? <p className="mt-2 text-xs text-ember">{exportError}</p> : null}
    </div>
  );
}
