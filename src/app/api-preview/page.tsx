import Image from "next/image";
import BackButton from "@/components/BackButton";
import ApiTryPanel from "@/components/ApiTryPanel";

export const metadata = {
  title: "TRAXR-AVAX API (Preview)",
  description:
    "Preview API surface for TRAXR-AVAX indexed data and decoupled scoring.",
};

export default function ApiPreviewPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-10 lg:px-16">
      <div className="pointer-events-none absolute inset-0 gridlines opacity-40" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 text-white">
        <BackButton />

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1220]/90 via-[#0f1f36]/70 to-[#0b0f1d]/80 p-6 sm:p-8 shadow-[0_0_80px_rgba(0,255,255,0.14)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,255,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(0,180,255,0.12),transparent_28%)]" />

          <div className="relative mx-auto max-w-4xl">
            <div className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Image
                src="/images/TRAXR.png"
                alt="TRAXR-AVAX"
                width={120}
                height={120}
                priority
                className="opacity-90"
              />
              <span className="text-xs tracking-wide text-slate-400 sm:text-sm">
                TRAXR-AVAX API (preview)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              TRAXR-AVAX API (Preview)
            </h1>
            <p className="mt-4 text-slate-400 text-sm tracking-wide">
              Read-only endpoints for indexed pool data and scoring outputs.
              Snapshot-backed data, no signing, no keys, no write operations.
            </p>

            <section className="mt-12">
              <h2 className="text-lg sm:text-xl font-medium">Base URL</h2>
              <p className="mt-3 text-slate-300">
                Local development: <span className="text-slate-100">/api/traxr</span>
              </p>
              <p className="mt-2 text-slate-300">
                All responses are JSON. Error payloads use
                <span className="text-slate-100"> {"{ error: \"...\" }"}</span>.
              </p>
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">Endpoints</h2>
              <div className="mt-4 space-y-4 text-slate-300">
                <div>
                  <div className="font-medium text-slate-100">
                    GET /api/traxr/score?mintA=...&amp;mintB=...
                  </div>
                  <div className="text-sm text-slate-400">
                    Returns the scored pool for a token pair. Fuzzy matches token
                    symbols, names, or addresses.
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-100">
                    GET /api/traxr/pools
                  </div>
                  <div className="text-sm text-slate-400">
                    Returns the current snapshot list of scored pools.
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-100">
                    GET /api/traxr/pools/:id
                  </div>
                  <div className="text-sm text-slate-400">
                    Returns a single pool by poolId.
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-100">
                    GET /api/traxr/pool-trend?poolId=...
                  </div>
                  <div className="text-sm text-slate-400">
                    Returns time-series snapshots for a pool (when available).
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-100">
                    GET /api/traxr/alerts
                  </div>
                  <div className="text-sm text-slate-400">
                    Returns pools with active warnings (snapshot-based).
                  </div>
                </div>
              </div>
            </section>

            <ApiTryPanel />

            <section className="mt-10 rounded-md border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg sm:text-xl font-medium">Preview Notes</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>Snapshot-backed data from GeckoTerminal.</li>
                <li>Derived heuristics are best-effort.</li>
                <li>Unknown values are intentional until scoring resolves them.</li>
              </ul>
            </section>

            <div className="mt-14">
              <BackButton />
            </div>

            <p className="mt-8 text-sm text-slate-500">
              Read-only by design. Deterministic by default.
            </p>
          </div>
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://github.com/CrosswalkEcosystem/TRAXR"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              GitHub
            </a>
            <a href="/methodology" className="hover:text-white">
              Methodology
            </a>
            <a href="/architecture" className="hover:text-white">
              Architecture
            </a>
            <a href="/data-model" className="hover:text-white">
              Data model
            </a>
            <a
              href="https://crosswalk.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              crosswalk.pro
            </a>
          </div>
          <div className="text-white/50">
            (c) 2026 Crosswalk Ecosystem LLC. All rights reserved.
          </div>
        </footer>
      </div>
    </main>
  );
}
