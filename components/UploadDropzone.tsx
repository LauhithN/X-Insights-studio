"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { parseCsv } from "@/lib/parseCsv";
import { normalizeContent } from "@/lib/normalizeContent";
import { normalizeOverview } from "@/lib/normalizeOverview";
import { FIELD_LABELS } from "@/lib/types";
import { normalizeHeader } from "@/lib/normalizeHelpers";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

type Message = {
  type: "success" | "error" | "warn" | "info";
  text: string;
};

const MAX_FILE_SIZE_MB = 12;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_ROWS_PER_FILE = 120000;
const MAX_FILES_PER_UPLOAD = 6;

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

function classifyCsv(fields: string[], fileName: string): "content" | "overview" | "unknown" {
  const normalized = fields.map(normalizeHeader);
  const normalizedFileName = normalizeHeader(fileName);
  const hasContentMarker = normalized.some((field) =>
    CONTENT_MARKERS.some((marker) => field.includes(marker))
  );
  const hasOverviewMarker = normalized.some((field) =>
    OVERVIEW_MARKERS.some((marker) => field.includes(marker))
  );
  const hasImpressions = normalized.some((field) => field.includes("impression") || field.includes("view"));

  if (hasContentMarker && hasImpressions && !hasOverviewMarker) return "content";
  if (hasOverviewMarker && hasImpressions && !hasContentMarker) return "overview";
  if (normalizedFileName.includes("overview") && hasImpressions) return "overview";
  if (
    (normalizedFileName.includes("content") ||
      normalizedFileName.includes("tweet") ||
      normalizedFileName.includes("post")) &&
    hasImpressions
  ) {
    return "content";
  }
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
  const [statusText, setStatusText] = useState("Waiting for CSV files.");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetMessages = useCallback(() => setMessages([]), []);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const addMessages = useCallback((newMessages: Message[]) => {
    if (!newMessages.length) return;
    setMessages((prev) => [...prev, ...newMessages]);
  }, []);

  const handleFiles = useCallback(
    async (rawFiles: File[]) => {
      if (!rawFiles.length) return;

      resetMessages();
      setIsLoading(true);
      setStatusText("Validating selected files...");

      try {
        const files = rawFiles.slice(0, MAX_FILES_PER_UPLOAD);
        if (rawFiles.length > MAX_FILES_PER_UPLOAD) {
          addMessage({
            type: "warn",
            text: `Only the first ${MAX_FILES_PER_UPLOAD} files were processed in this upload.`
          });
        }

        const validCsvFiles: File[] = [];
        const rejectedMessages: Message[] = [];

        files.forEach((file) => {
          const isCsv = file.name.toLowerCase().endsWith(".csv");
          if (!isCsv) {
            rejectedMessages.push({
              type: "error",
              text: `${file.name}: Unsupported file type. Please upload CSV files only.`
            });
            return;
          }

          if (file.size > MAX_FILE_SIZE_BYTES) {
            rejectedMessages.push({
              type: "error",
              text: `${file.name}: File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed is ${MAX_FILE_SIZE_MB} MB.`
            });
            return;
          }

          validCsvFiles.push(file);
        });

        addMessages(rejectedMessages);

        if (!validCsvFiles.length) {
          setStatusText("No valid CSV files were selected.");
          return;
        }

        for (let index = 0; index < validCsvFiles.length; index += 1) {
          const file = validCsvFiles[index];
          const fileMessages: Message[] = [];
          setStatusText(`Parsing ${file.name} (${index + 1}/${validCsvFiles.length})...`);

          const parsed = await parseCsv(file, { maxRows: MAX_ROWS_PER_FILE });
          if (parsed.errors.length) {
            fileMessages.push({
              type: parsed.truncated ? "error" : "warn",
              text: `${file.name}: ${parsed.errors.join("; ")}`
            });
          }

          if (!parsed.fields.length) {
            fileMessages.push({
              type: "error",
              text: `${file.name}: CSV headers were not detected.`
            });
            addMessages(fileMessages);
            continue;
          }

          const type = classifyCsv(parsed.fields, file.name);
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
            if (normalized.missingOptional.length) {
              fileMessages.push({
                type: "warn",
                text: `${file.name}: Optional columns missing (${formatMissing(normalized.missingOptional)}). Metrics may be limited.`
              });
            }
            normalized.warnings.forEach((warning) =>
              fileMessages.push({ type: "warn", text: `${file.name}: ${warning}` })
            );
            fileMessages.push({
              type: "success",
              text: `${file.name}: Loaded content analytics (${parsed.rowCount.toLocaleString()} rows).`
            });
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
            if (normalized.missingOptional.length) {
              fileMessages.push({
                type: "warn",
                text: `${file.name}: Optional columns missing (${formatMissing(normalized.missingOptional)}). Some trends may be hidden.`
              });
            }
            normalized.warnings.forEach((warning) =>
              fileMessages.push({ type: "warn", text: `${file.name}: ${warning}` })
            );
            fileMessages.push({
              type: "success",
              text: `${file.name}: Loaded overview analytics (${parsed.rowCount.toLocaleString()} rows).`
            });
            return { ok: true, missing: [], optional: [], warnings: [] };
          };

          if (type === "content") {
            const result = tryContent();
            if (!result.ok) {
              fileMessages.push({
                type: "error",
                text: `${file.name}: Missing required content columns (${formatMissing(result.missing)}).`
              });
            }
            addMessages(fileMessages);
            continue;
          }

          if (type === "overview") {
            const result = tryOverview();
            if (!result.ok) {
              fileMessages.push({
                type: "error",
                text: `${file.name}: Missing required overview columns (${formatMissing(result.missing)}).`
              });
            }
            addMessages(fileMessages);
            continue;
          }

          const contentResult = tryContent();
          if (contentResult.ok) {
            fileMessages.push({
              type: "info",
              text: `${file.name}: Auto-detected this file as content analytics.`
            });
            addMessages(fileMessages);
            continue;
          }

          const overviewResult = tryOverview();
          if (overviewResult.ok) {
            fileMessages.push({
              type: "info",
              text: `${file.name}: Auto-detected this file as overview analytics.`
            });
            addMessages(fileMessages);
            continue;
          }

          fileMessages.push({
            type: "error",
            text: `${file.name}: Could not classify CSV. Missing required columns (${formatMissing(
              Array.from(new Set([...contentResult.missing, ...overviewResult.missing]))
            )}).`
          });
          addMessages(fileMessages);
        }

        setStatusText("CSV processing complete.");
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, addMessages, resetMessages, setContentRows, setOverviewRows]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
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
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-busy={isLoading}
        aria-label="Upload CSV files"
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="pill mx-auto">Upload CSVs</div>
          <h3 className="text-2xl font-semibold">Drop X analytics exports here</h3>
          <p className="text-sm text-slate">
            Drag and drop the content CSV (required) and overview CSV (optional). We never send your
            data anywhere.
          </p>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-edge/70 bg-white/10 px-5 py-2 text-sm font-semibold transition hover:bg-white/20 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-neon">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv"
                multiple
                onChange={onPickFiles}
              />
              Select CSV files
            </label>
          </div>
          <p className="text-xs text-slate">
            Limits: {MAX_FILE_SIZE_MB} MB per file, up to {MAX_ROWS_PER_FILE.toLocaleString()} rows per file.
          </p>
          <p className="text-xs text-slate" aria-live="polite" role="status">
            {isLoading ? statusText : "Ready to parse files."}
          </p>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" role="status">
        {statusText}
      </p>

      {messages.length > 0 ? (
        <div className="glass-card space-y-2 border-edge/60 p-4 text-sm" aria-live="polite">
          {messages.map((message, index) => (
            <p
              key={`${message.type}-${index}`}
              className={
                message.type === "error"
                  ? "text-ember"
                  : message.type === "warn"
                    ? "text-slate"
                    : message.type === "info"
                      ? "text-white"
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
