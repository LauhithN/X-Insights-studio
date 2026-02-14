"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

type UploadPhase = "idle" | "loading" | "success" | "error";

const MAX_FILE_SIZE_MB = 12;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_ROWS_PER_FILE = 120000;
const MAX_FILES_PER_UPLOAD = 6;

const CONTENT_MARKERS = [
  "posttext", "tweettext", "text", "tweet", "post", "content", "body",
  "createdat", "posttime", "tweettime", "timestamp"
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

/* Spinner SVG for loading state */
function LoadingSpinner() {
  return (
    <svg className="h-10 w-10 animate-spin-slow" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="17" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <path
        d="M37 20a17 17 0 01-17 17"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function UploadDropzone() {
  const router = useRouter();
  const setContentRows = useAnalyticsStore((state) => state.setContentRows);
  const setOverviewRows = useAnalyticsStore((state) => state.setOverviewRows);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [statusText, setStatusText] = useState("");
  const [loadedCount, setLoadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetMessages = useCallback(() => setMessages([]), []);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const addMessages = useCallback((newMessages: Message[]) => {
    if (!newMessages.length) return;
    setMessages((prev) => [...prev, ...newMessages]);
  }, []);

  const resetToIdle = useCallback(() => {
    setPhase("idle");
    setMessages([]);
    setStatusText("");
    setLoadedCount(0);
  }, []);

  const handleFiles = useCallback(
    async (rawFiles: File[]) => {
      if (!rawFiles.length) return;

      resetMessages();
      setPhase("loading");
      setStatusText("Validating files...");
      setLoadedCount(0);

      let totalLoaded = 0;
      let hasError = false;

      try {
        const files = rawFiles.slice(0, MAX_FILES_PER_UPLOAD);
        if (rawFiles.length > MAX_FILES_PER_UPLOAD) {
          addMessage({
            type: "warn",
            text: `Only the first ${MAX_FILES_PER_UPLOAD} files were processed.`
          });
        }

        const validCsvFiles: File[] = [];
        const rejectedMessages: Message[] = [];

        files.forEach((file) => {
          const isCsv = file.name.toLowerCase().endsWith(".csv");
          if (!isCsv) {
            rejectedMessages.push({
              type: "error",
              text: `${file.name} — not a CSV file.`
            });
            return;
          }
          if (file.size > MAX_FILE_SIZE_BYTES) {
            rejectedMessages.push({
              type: "error",
              text: `${file.name} — too large (${(file.size / (1024 * 1024)).toFixed(1)} MB, max ${MAX_FILE_SIZE_MB} MB).`
            });
            return;
          }
          validCsvFiles.push(file);
        });

        addMessages(rejectedMessages);

        if (!validCsvFiles.length) {
          setPhase("error");
          setStatusText("No valid CSV files found.");
          return;
        }

        for (let index = 0; index < validCsvFiles.length; index += 1) {
          const file = validCsvFiles[index];
          const fileMessages: Message[] = [];
          setStatusText(`Parsing ${file.name}...`);

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
              text: `${file.name} — no headers detected.`
            });
            addMessages(fileMessages);
            hasError = true;
            continue;
          }

          const type = classifyCsv(parsed.fields, file.name);
          const tryContent = () => {
            const normalized = normalizeContent(parsed.rows, parsed.fields);
            if (normalized.missingRequired.length) {
              return { ok: false, missing: normalized.missingRequired, optional: normalized.missingOptional, warnings: normalized.warnings };
            }
            setContentRows(normalized.rows, file.name, normalized.missingOptional);
            if (normalized.missingOptional.length) {
              fileMessages.push({
                type: "warn",
                text: `${file.name}: Some optional columns missing (${formatMissing(normalized.missingOptional)}).`
              });
            }
            normalized.warnings.forEach((warning) =>
              fileMessages.push({ type: "warn", text: `${file.name}: ${warning}` })
            );
            fileMessages.push({
              type: "success",
              text: `${file.name}: ${parsed.rowCount.toLocaleString()} posts loaded.`
            });
            return { ok: true, missing: [], optional: [], warnings: [] };
          };

          const tryOverview = () => {
            const normalized = normalizeOverview(parsed.rows, parsed.fields);
            if (normalized.missingRequired.length) {
              return { ok: false, missing: normalized.missingRequired, optional: normalized.missingOptional, warnings: normalized.warnings };
            }
            setOverviewRows(normalized.rows, file.name, normalized.missingOptional);
            if (normalized.missingOptional.length) {
              fileMessages.push({
                type: "warn",
                text: `${file.name}: Some optional columns missing (${formatMissing(normalized.missingOptional)}).`
              });
            }
            normalized.warnings.forEach((warning) =>
              fileMessages.push({ type: "warn", text: `${file.name}: ${warning}` })
            );
            fileMessages.push({
              type: "success",
              text: `${file.name}: ${parsed.rowCount.toLocaleString()} days loaded.`
            });
            return { ok: true, missing: [], optional: [], warnings: [] };
          };

          let loaded = false;

          if (type === "content") {
            const result = tryContent();
            if (!result.ok) {
              fileMessages.push({
                type: "error",
                text: `${file.name}: Missing required columns (${formatMissing(result.missing)}).`
              });
              hasError = true;
            } else {
              loaded = true;
            }
            addMessages(fileMessages);
            if (loaded) totalLoaded += parsed.rowCount;
            continue;
          }

          if (type === "overview") {
            const result = tryOverview();
            if (!result.ok) {
              fileMessages.push({
                type: "error",
                text: `${file.name}: Missing required columns (${formatMissing(result.missing)}).`
              });
              hasError = true;
            } else {
              loaded = true;
            }
            addMessages(fileMessages);
            if (loaded) totalLoaded += parsed.rowCount;
            continue;
          }

          const contentResult = tryContent();
          if (contentResult.ok) {
            fileMessages.push({ type: "info", text: `${file.name}: Auto-detected as content analytics.` });
            addMessages(fileMessages);
            totalLoaded += parsed.rowCount;
            continue;
          }

          const overviewResult = tryOverview();
          if (overviewResult.ok) {
            fileMessages.push({ type: "info", text: `${file.name}: Auto-detected as overview analytics.` });
            addMessages(fileMessages);
            totalLoaded += parsed.rowCount;
            continue;
          }

          fileMessages.push({
            type: "error",
            text: `${file.name}: Could not classify. Missing columns: ${formatMissing(
              Array.from(new Set([...contentResult.missing, ...overviewResult.missing]))
            )}.`
          });
          hasError = true;
          addMessages(fileMessages);
        }

        setLoadedCount(totalLoaded);

        if (totalLoaded > 0) {
          setPhase("success");
          setStatusText(`${totalLoaded.toLocaleString()} rows loaded successfully.`);
        } else {
          setPhase("error");
          setStatusText("No data could be loaded from the selected files.");
        }
      } catch {
        setPhase("error");
        setStatusText("An unexpected error occurred while parsing.");
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

  /* ---- Idle state ---- */
  if (phase === "idle") {
    return (
      <div className="space-y-3">
        <div
          className={`rounded-xl border border-dashed ${
            dragActive ? "border-white/20 bg-white/[0.04]" : "border-white/[0.08] bg-white/[0.015]"
          } p-10 text-center transition-colors`}
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
          aria-label="Upload CSV files"
        >
          <div className="mx-auto max-w-sm">
            {/* Upload icon */}
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03]">
              <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white/80">
              Drop CSV files here
            </p>
            <p className="mt-1.5 text-xs text-slate/50">
              or click to browse
            </p>
            <div className="mt-5">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv"
                  multiple
                  onChange={onPickFiles}
                />
                Select files
              </label>
            </div>
            <p className="mt-4 text-[11px] text-slate/40">
              Max {MAX_FILE_SIZE_MB} MB per file, up to {MAX_ROWS_PER_FILE.toLocaleString()} rows
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Loading state ---- */
  if (phase === "loading") {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <LoadingSpinner />
          <div>
            <p className="text-sm font-medium text-white/80">{statusText}</p>
            <p className="mt-1 text-xs text-slate/40">Processing your data locally...</p>
          </div>
          {/* Animated progress bar */}
          <div className="mt-2 h-0.5 w-48 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-full animate-progress-slide rounded-full bg-white/30" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Success state ---- */
  if (phase === "success") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-neon/20 bg-neon/[0.06]">
            <svg className="h-5 w-5 text-neon/80" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white/90">
            {statusText}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full max-w-xs rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#060a10] transition-colors hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
          >
            Open Data
          </button>
          <button
            onClick={resetToIdle}
            className="mt-3 text-xs text-slate/50 transition-colors hover:text-slate/80"
          >
            Upload more files
          </button>
        </div>

        {/* Messages */}
        {messages.length > 0 && (
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 space-y-1.5">
            {messages.map((message, index) => (
              <p
                key={`${message.type}-${index}`}
                className={`text-xs ${
                  message.type === "error"
                    ? "text-red-400/80"
                    : message.type === "warn"
                      ? "text-amber-400/70"
                      : message.type === "info"
                        ? "text-white/60"
                        : "text-neon/70"
                }`}
              >
                {message.text}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---- Error state ---- */
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-red-400/20 bg-red-400/[0.06]">
          <svg className="h-5 w-5 text-red-400/70" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-white/80">{statusText}</p>
        <button
          onClick={resetToIdle}
          className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08]"
        >
          Try again
        </button>
      </div>

      {messages.length > 0 && (
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 space-y-1.5">
          {messages.map((message, index) => (
            <p
              key={`${message.type}-${index}`}
              className={`text-xs ${
                message.type === "error"
                  ? "text-red-400/80"
                  : message.type === "warn"
                    ? "text-amber-400/70"
                    : "text-white/60"
              }`}
            >
              {message.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
