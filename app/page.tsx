import UploadDropzone from "@/components/UploadDropzone";
import DemoModeButton from "@/components/DemoModeButton";
import DashboardEntryActions from "@/components/DashboardEntryActions";

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-5xl px-6 pt-20 pb-16">
        {/* Minimal header */}
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 rounded-md border-l-2 border-neon/60 bg-white/[0.03] px-3 py-1.5 text-xs text-slate">
            X Insights Studio
          </div>
          <h1 className="mt-6 max-w-2xl text-[2.5rem] font-medium leading-[1.15] tracking-tight text-white sm:text-5xl">
            Find what grows your audience, not just what gets likes.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate/80">
            Drop your X analytics exports and surface the posts that actually
            convert — timing patterns, growth signals, and where engagement
            fails to become followers.
          </p>
        </header>

        {/* Main upload area - centered and prominent */}
        <section className="mb-12">
          <UploadDropzone />
        </section>

        {/* Bottom row: demo + info */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-sm font-medium text-white/90">Quick preview</p>
            <p className="mt-1.5 text-xs text-slate/70">
              Test the full dashboard with built-in sample data.
            </p>
            <div className="mt-4">
              <DemoModeButton />
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-sm font-medium text-white/90">What to upload</p>
            <ul className="mt-3 space-y-2 text-xs text-slate/70">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-neon/50" />
                Content CSV — per-post analytics from X
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-white/20" />
                Overview CSV — daily account metrics (optional)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-white/20" />
                Headers are auto-normalized
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-medium text-white/90">Your data</p>
            <p className="mt-1.5 text-xs text-slate/70">
              Everything runs locally. Nothing leaves your browser.
            </p>
            <div className="mt-4">
              <DashboardEntryActions />
            </div>
          </div>
        </section>

        {/* Subtle file format hint */}
        <div className="mt-10 rounded-lg border border-white/[0.04] bg-white/[0.015] px-4 py-3">
          <p className="font-mono text-[11px] text-slate/50">
            Expected: account_analytics_content_*.csv,
            account_overview_analytics.csv
          </p>
        </div>
      </div>
    </main>
  );
}
