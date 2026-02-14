import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <main className="page-shell">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="glass-card p-6 sm:p-8">
          <p className="pill">Information</p>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">How It Works</h1>
          <p className="mt-3 text-sm text-slate/90">Simple flow. Fast output.</p>
        </header>

        <section className="glass-card p-6 sm:p-8">
          <div className="space-y-4 text-sm text-slate/90">
            <p>
              <span className="font-semibold text-white">1.</span> Upload your content CSV.
            </p>
            <p>
              <span className="font-semibold text-white">2.</span> Optionally upload overview CSV for daily trends.
            </p>
            <p>
              <span className="font-semibold text-white">3.</span> Review conversion, heatmaps, and viral cards.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn-secondary">
            Back home
          </Link>
          <Link href="/upload-guide" className="btn-secondary">
            Upload guide
          </Link>
        </div>
      </div>
    </main>
  );
}
