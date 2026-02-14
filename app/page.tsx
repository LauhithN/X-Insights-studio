import UploadDropzone from "@/components/UploadDropzone";
import DemoModeButton from "@/components/DemoModeButton";
import DashboardEntryActions from "@/components/DashboardEntryActions";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="fade-in-up flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-3xl">
            <p className="pill">X Insights Studio</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              See what grows your audience, not just what gets likes.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate">
              Drop your X exports and instantly surface conversion-driving posts, timing patterns, and
              where engagement fails to convert into followers.
            </p>
          </div>
          <div className="glass-card w-full max-w-sm space-y-3 p-6">
            <p className="text-sm text-slate">Need to preview the dashboard quickly?</p>
            <DemoModeButton />
            <p className="text-xs text-slate">
              Loads a small built-in dataset so you can test the full experience without uploading files.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <UploadDropzone />
          <div className="glass-card space-y-6 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate">What to upload</p>
              <ul className="mt-4 space-y-3 text-sm text-slate">
                <li>Content CSV (required): per-post analytics export from X.</li>
                <li>Overview CSV (optional): daily account metrics for trend lines.</li>
                <li>Header variations are normalized automatically.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate">
              Example files: <br />
              <span className="text-white">account_analytics_content_YYYY-MM-DD_YYYY-MM-DD.csv</span>
              <br />
              <span className="text-white">account_overview_analytics.csv</span>
            </div>
            <DashboardEntryActions />
          </div>
        </section>
      </div>
    </main>
  );
}
