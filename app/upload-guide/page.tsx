import Link from "next/link";

export default function UploadGuidePage() {
  return (
    <main className="page-shell">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="glass-card p-6 sm:p-8">
          <p className="pill">Information</p>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Upload Guide</h1>
          <p className="mt-3 text-sm text-slate/90">What files to upload and what they unlock.</p>
        </header>

        <section className="glass-card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">Required</h2>
          <p className="mt-2 text-sm text-slate/90">Content CSV with post text, timestamp, and impressions.</p>
          <h2 className="mt-6 text-lg font-semibold text-white">Optional</h2>
          <p className="mt-2 text-sm text-slate/90">Overview CSV for daily impressions, follows, and profile visits.</p>
          <div className="mt-6 rounded-2xl border border-edge/70 bg-white/[0.03] p-4 text-xs text-slate/90">
            Example files:
            <br />
            <span className="font-data text-sand">account_analytics_content_YYYY-MM-DD_YYYY-MM-DD.csv</span>
            <br />
            <span className="font-data text-sand">account_overview_analytics.csv</span>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn-secondary">
            Back home
          </Link>
          <Link href="/how-it-works" className="btn-secondary">
            How it works
          </Link>
        </div>
      </div>
    </main>
  );
}
