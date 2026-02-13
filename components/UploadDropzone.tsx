"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseCsv } from "@/lib/parseCsv";
import { normalizeContent } from "@/lib/normalizeContent";
import { normalizeOverview } from "@/lib/normalizeOverview";
import { FIELD_LABELS } from "@/lib/types";
import { normalizeHeader } from "@/lib/normalizeHelpers";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

type Message = {
  type: "success" | "error" | "warn";
  text: string;
};

const CONTENT_MARKERS = [
  "posttext",
  "tweettext",
  "text",
  "tweet",
  "post",
  "content",
  "body",
  "createdat",
  "posttime",
  "tweettime",
  "timestamp"
];

const OVERVIEW_MARKERS = ["date", "day", "engagements"];

function classifyCsv(fields: string[]): "content" | "overview" | "unknown" {
  const normalized = fields.map(normalizeHeader);
  const hasContentMarker = normalized.some((field) =>
    CONTENT_MARKERS.some((marker) => field.includes(marker))
  );
  const hasOverviewMarker = normalized.some((field) =>
    OVERVIEW_MARKERS.some((marker) => field.includes(marker))
  );
  const hasImpressions = normalized.some((field) => field.includes("impression") || field.includes("view"));

  if (hasContentMarker && hasImpressions) return "content";
  if (hasOverviewMarker && hasImpressions && !hasContentMarker) return "overview";
  return "unknown";
}

function formatMissing(missing: string[]): string {
  return missing.map((field) => FIELD_LABELS[field] ?? field).join(", ");
}

function truncateName(fileName: string): string {
  if (fileName.length <= 54) return fileName;
  return `${fileName.slice(0, 51)}...`;
}

export default function UploadDropzone() {
  const router = useRouter();
  const setContentRows = useAnalyticsStore((state) => state.setContentRows);
  const setOverviewRows = useAnalyticsStore((state) => state.setOverviewRows);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const dragActive = dragDepth > 0;

  const resetMessages = useCallback(() => setMessages([]), []);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      resetMessages();
      setIsLoading(true);
      let loadedContent = false;
      let loadedOverview = false;

      try {
        for (const file of files) {
          if (!file.name.toLowerCase().endsWith(".csv")) {
            addMessage({
              type: "error",
              text: `${truncateName(file.name)}: Only .csv files are supported.`
            });
            continue;
          }

          try {
            const parsed = await parseCsv(file);

            if (parsed.errors.length) {
              addMessage({
                type: "warn",
                text: `${truncateName(file.name)}: ${parsed.errors.join("; ")}`
              });
            }

            const type = classifyCsv(parsed.fields);
            const tryContent = () => {
              const normalized = normalizeContent(parsed.rows, parsed.fields);
              if (normalized.missingRequired.length) {
                return {
                  ok: false,
                  missing: normalized.missingRequired,
                  optional: normalized.missingOptional,
                  warnings: normalized.warnings
                };
              }
              setContentRows(normalized.rows, file.name, normalized.missingOptional);
              loadedContent = true;
              if (normalized.missingOptional.length) {
                addMessage({
                  type: "warn",
                  text: `${truncateName(file.name)}: Optional columns missing (${formatMissing(normalized.missingOptional)}). Metrics may be limited.`
                });
              }
              normalized.warnings.forEach((warning) =>
                addMessage({ type: "warn", text: `${truncateName(file.name)}: ${warning}` })
              );
              addMessage({ type: "success", text: `${truncateName(file.name)}: Content analytics loaded.` });
              return { ok: true, missing: [], optional: [], warnings: [] };
            };

            const tryOverview = () => {
              const normalized = normalizeOverview(parsed.rows, parsed.fields);
              if (normalized.missingRequired.length) {
                return {
                  ok: false,
                  missing: normalized.missingRequired,
                  optional: normalized.missingOptional,
                  warnings: normalized.warnings
                };
              }
              setOverviewRows(normalized.rows, file.name, normalized.missingOptional);
              loadedOverview = true;
              if (normalized.missingOptional.length) {
                addMessage({
                  type: "warn",
                  text: `${truncateName(file.name)}: Optional columns missing (${formatMissing(normalized.missingOptional)}). Some trends may be hidden.`
                });
              }
              normalized.warnings.forEach((warning) =>
                addMessage({ type: "warn", text: `${truncateName(file.name)}: ${warning}` })
              );
              addMessage({ type: "success", text: `${truncateName(file.name)}: Overview analytics loaded.` });
              return { ok: true, missing: [], optional: [], warnings: [] };
            };

            if (type === "content") {
              const result = tryContent();
              if (!result.ok) {
                addMessage({
                  type: "error",
                  text: `${truncateName(file.name)}: Missing required content columns (${formatMissing(result.missing)}).`
                });
              }
              continue;
            }

            if (type === "overview") {
              const result = tryOverview();
              if (!result.ok) {
                addMessage({
                  type: "error",
                  text: `${truncateName(file.name)}: Missing required overview columns (${formatMissing(result.missing)}).`
                });
              }
              continue;
            }

            const contentResult = tryContent();
            if (contentResult.ok) continue;

            const overviewResult = tryOverview();
            if (overviewResult.ok) continue;

            addMessage({
              type: "error",
              text: `${truncateName(file.name)}: Could not classify CSV. Missing required columns (${formatMissing(
                Array.from(new Set([...contentResult.missing, ...overviewResult.missing]))
              )}).`
            });
          } catch (error) {
            const reason = error instanceof Error ? error.message : "Unknown parsing error";
            addMessage({
              type: "error",
              text: `${truncateName(file.name)}: ${reason}`
            });
          }
        }
      } finally {
        setIsLoading(false);
        setDragDepth(0);
      }

      if (loadedContent && !loadedOverview) {
        setOverviewRows([], "", []);
        addMessage({
          type: "warn",
          text: "Overview data was cleared. Upload a matching overview CSV to refresh daily trends."
        });
      }

      if (loadedContent || loadedOverview) {
        const hasContentAfterUpload = useAnalyticsStore.getState().contentRows.length > 0;
        if (hasContentAfterUpload) {
          router.push("/dashboard");
        }
      }
    },
    [addMessage, resetMessages, router, setContentRows, setOverviewRows]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragDepth(0);
      const files = Array.from(event.dataTransfer.files);
      handleFiles(files);
    },
    [handleFiles]
  );

  const onPickFiles = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      handleFiles(files);
      event.target.value = "";
    },
    [handleFiles]
  );

  const dropzoneClasses = useMemo(
    () =>
      `glass-card grid-stroke w-full border-dashed p-7 transition sm:p-8 ${
        dragActive ? "border-neon/80 shadow-glow" : "border-edge/80"
      }`,
    [dragActive]
  );

  return (
    <div className="space-y-4">
      <div
        className={dropzoneClasses}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragDepth((value) => value + 1);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragDepth((value) => Math.max(0, value - 1));
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="pill mx-auto">Upload CSVs</div>
          <h3 className="text-2xl font-semibold text-white">Drop files here</h3>
          <p className="mx-auto max-w-xl text-sm text-slate/90">Content CSV required. Overview CSV optional.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate/80">
            <span className="soft-chip">Accepts .csv only</span>
            <span className="soft-chip">Multiple files supported</span>
            <span className="soft-chip">Local-only parsing</span>
          </div>
          <div>
            <label className="btn-secondary cursor-pointer">
              <input type="file" className="hidden" accept=".csv" multiple onChange={onPickFiles} />
              Select CSV files
            </label>
          </div>
          {isLoading ? <p className="text-xs text-neon">Parsing files and validating headers...</p> : null}
        </div>
      </div>

      {messages.length > 0 ? (
        <ul className="glass-card space-y-2 border-edge/80 p-4 text-sm" aria-live="polite">
          {messages.map((message, index) => {
            const toneClass =
              message.type === "error"
                ? "border-ember/40 bg-ember/10 text-ember"
                : message.type === "warn"
                  ? "border-edge/70 bg-white/[0.03] text-slate"
                  : "border-neon/40 bg-neon/10 text-neon";
            const toneLabel = message.type === "error" ? "Error" : message.type === "warn" ? "Warning" : "Success";

            return (
              <li key={`${message.type}-${index}`} className={`rounded-xl border px-3 py-2 ${toneClass}`}>
                <span className="mr-2 text-[11px] uppercase tracking-[0.16em]">{toneLabel}</span>
                <span className="text-sm leading-relaxed">{message.text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
