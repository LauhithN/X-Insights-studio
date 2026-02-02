"use client";

import { useCallback, useMemo, useState } from "react";
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

export default function UploadDropzone() {
  const setContentRows = useAnalyticsStore((state) => state.setContentRows);
  const setOverviewRows = useAnalyticsStore((state) => state.setOverviewRows);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resetMessages = useCallback(() => setMessages([]), []);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      resetMessages();
      setIsLoading(true);

      for (const file of files) {
        const parsed = await parseCsv(file);
        if (parsed.errors.length) {
          addMessage({
            type: "warn",
            text: `${file.name}: ${parsed.errors.join("; ")}`
          });
        }

        const type = classifyCsv(parsed.fields);
        const tryContent = () => {
          const normalized = normalizeContent(parsed.rows, parsed.fields);
          if (normalized.missingRequired.length) {
            return { ok: false, missing: normalized.missingRequired, optional: normalized.missingOptional, warnings: normalized.warnings };
          }
          setContentRows(normalized.rows, file.name, normalized.missingOptional);
          if (normalized.missingOptional.length) {
            addMessage({
              type: "warn",
              text: `${file.name}: Optional columns missing (${formatMissing(normalized.missingOptional)}). Metrics may be limited.`
            });
          }
          normalized.warnings.forEach((warning) =>
            addMessage({ type: "warn", text: `${file.name}: ${warning}` })
          );
          addMessage({ type: "success", text: `${file.name}: Content analytics loaded.` });
          return { ok: true, missing: [], optional: [], warnings: [] };
        };

        const tryOverview = () => {
          const normalized = normalizeOverview(parsed.rows, parsed.fields);
          if (normalized.missingRequired.length) {
            return { ok: false, missing: normalized.missingRequired, optional: normalized.missingOptional, warnings: normalized.warnings };
          }
          setOverviewRows(normalized.rows, file.name, normalized.missingOptional);
          if (normalized.missingOptional.length) {
            addMessage({
              type: "warn",
              text: `${file.name}: Optional columns missing (${formatMissing(normalized.missingOptional)}). Some trends may be hidden.`
            });
          }
          normalized.warnings.forEach((warning) =>
            addMessage({ type: "warn", text: `${file.name}: ${warning}` })
          );
          addMessage({ type: "success", text: `${file.name}: Overview analytics loaded.` });
          return { ok: true, missing: [], optional: [], warnings: [] };
        };

        if (type === "content") {
          const result = tryContent();
          if (!result.ok) {
            addMessage({
              type: "error",
              text: `${file.name}: Missing required content columns (${formatMissing(result.missing)}).`
            });
          }
          continue;
        }

        if (type === "overview") {
          const result = tryOverview();
          if (!result.ok) {
            addMessage({
              type: "error",
              text: `${file.name}: Missing required overview columns (${formatMissing(result.missing)}).`
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
          text: `${file.name}: Could not classify CSV. Missing required columns (${formatMissing(
            Array.from(new Set([...contentResult.missing, ...overviewResult.missing]))
          )}).`
        });
      }

      setIsLoading(false);
    },
    [addMessage, resetMessages, setContentRows, setOverviewRows]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      const files = Array.from(event.dataTransfer.files).filter((file) => file.name.endsWith(".csv"));
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
      `glass-card grid-stroke w-full border-dashed p-8 transition ${
        dragActive ? "border-neon/70 shadow-glow" : "border-edge"
      }`,
    [dragActive]
  );

  return (
    <div className="space-y-4">
      <div
        className={dropzoneClasses}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="pill mx-auto">Upload CSVs</div>
          <h3 className="text-2xl font-semibold">Drop X analytics exports here</h3>
          <p className="text-sm text-slate/80">
            Drag & drop the content CSV (required) and the overview CSV (optional). We never send your data
            anywhere.
          </p>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-edge/70 bg-white/10 px-5 py-2 text-sm font-semibold transition hover:bg-white/20">
              <input type="file" className="hidden" accept=".csv" multiple onChange={onPickFiles} />
              Select CSV files
            </label>
          </div>
          {isLoading ? <p className="text-xs text-slate/80">Parsing files...</p> : null}
        </div>
      </div>

      {messages.length > 0 ? (
        <div className="glass-card space-y-2 border-edge/60 p-4 text-sm">
          {messages.map((message, index) => (
            <p
              key={`${message.type}-${index}`}
              className={
                message.type === "error"
                  ? "text-ember"
                  : message.type === "warn"
                  ? "text-slate"
                  : "text-neon"
              }
            >
              {message.text}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
