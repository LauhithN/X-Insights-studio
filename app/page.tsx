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
    <main className="page-shell">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:gap-10">
        <header className="glass-card motion-rise p-6 sm:p-8">
          <p className="pill">X Insights Studio</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Upload. Analyze. Ship better posts.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate/90">CSV-only analytics for X. No API setup.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                loadDemo();
                router.push("/dashboard");
              }}
              className="btn-primary"
            >
              Load demo
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              disabled={!hasContent}
              className="btn-secondary"
            >
              Open dashboard
            </button>
            <Link href="/how-it-works" className="btn-secondary">
              How it works
            </Link>
            <Link href="/upload-guide" className="btn-secondary">
              Upload guide
            </Link>
          </div>
          {!hasContent ? (
            <p className="mt-3 text-xs text-slate/80">Upload a content CSV to start.</p>
          ) : (
            <p className="mt-3 text-xs text-neon">Content loaded. Dashboard is ready.</p>
          )}
        </header>

        <section className="motion-rise">
          <UploadDropzone />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link href="/how-it-works" className="glass-card p-5 transition hover:bg-white/[0.05]">
            <p className="section-eyebrow">Information</p>
            <h2 className="mt-2 text-lg font-semibold text-white">How It Works</h2>
            <p className="mt-2 text-sm text-slate/85">3 quick steps, no fluff.</p>
          </Link>
          <Link href="/upload-guide" className="glass-card p-5 transition hover:bg-white/[0.05]">
            <p className="section-eyebrow">Information</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Upload Guide</h2>
            <p className="mt-2 text-sm text-slate/85">Required columns and file examples.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
