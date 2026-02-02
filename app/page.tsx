"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import UploadDropzone from "@/components/UploadDropzone";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export default function HomePage() {
  const router = useRouter();
  const contentRows = useAnalyticsStore((state) => state.contentRows);
  const loadDemo = useAnalyticsStore((state) => state.loadDemo);

  const hasContent = contentRows.length > 0;

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="pill">X Insights Studio</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Viral-ready X analytics, powered by your CSV exports.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate/80">
              Drop your X analytics exports and instantly see which tweets convert followers, when your
              audience shows up, and why engagement does not always equal growth.
            </p>
          </div>
          <div className="glass-card w-full max-w-sm space-y-3 p-6">
            <p className="text-sm text-slate/80">Need to preview the UI?</p>
            <button
              onClick={() => {
                loadDemo();
                router.push("/dashboard");
              }}
              className="w-full rounded-full border border-neon/60 bg-neon/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon/30"
            >
              Demo mode
            </button>
            <p className="text-xs text-slate/80">
              Loads a tiny embedded dataset so you can explore the dashboard without uploading files.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <UploadDropzone />
          <div className="glass-card space-y-6 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate/80">What to upload</p>
              <ul className="mt-4 space-y-3 text-sm text-slate/80">
                <li>Content CSV (required): per-post analytics from X.</li>
                <li>Overview CSV (optional): daily account analytics for trends.</li>
                <li>We normalize common header variations automatically.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate/80">
              Example files: <br />
              <span className="text-white">account_analytics_content_YYYY-MM-DD_YYYY-MM-DD.csv</span>
              <br />
              <span className="text-white">account_overview_analytics.csv</span>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                disabled={!hasContent}
                className="rounded-full border border-edge/60 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Go to dashboard
              </button>
              {!hasContent ? (
                <p className="text-xs text-slate/80">Upload a content CSV to unlock the dashboard.</p>
              ) : null}
              <Link href="/dashboard" className="text-xs text-slate/80 underline">
                Already loaded data? Jump to dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
