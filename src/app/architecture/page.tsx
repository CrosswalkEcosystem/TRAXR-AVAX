import Image from "next/image";
import BackButton from "@/components/BackButton";
import TraxrArchitectureFlow from "@/components/TraxrArchitectureFlow";

export const metadata = {
  title: "TRAXR-AVAX Architecture",
  description:
    "Architecture overview for TRAXR-AVAX: indexing, normalization, and decoupled scoring.",
};

export default function ArchitecturePage() {
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
                TRAXR-AVAX | Architecture
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              TRAXR-AVAX Architecture
            </h1>
            <p className="mt-4 text-slate-400 text-sm tracking-wide">
              Indexed AVAX data, deterministic normalization, and decoupled scoring.
            </p>

            <section className="mt-12">
              <h2 className="text-lg sm:text-xl font-medium">
                Architectural Overview
              </h2>
              <p className="mt-3 text-slate-300">
                TRAXR-AVAX is a read-only indexing layer for AVAX pools. It
                prioritizes correctness, reproducibility, and explicit separation
                between raw data and scoring logic.
              </p>
            </section>

            <TraxrArchitectureFlow />

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                Core Data Pipeline
              </h2>

              <ol className="mt-4 space-y-4 text-slate-300 list-decimal pl-5">
                <li>
                  <b>GeckoTerminal Ingestion</b>
                  <div className="text-slate-400 text-sm mt-1">
                    Pool identifiers, token metadata, liquidity, volume, and DEX attribution.
                  </div>
                </li>

                <li>
                  <b>Normalization Layer</b>
                  <div className="text-slate-400 text-sm mt-1">
                    Raw inputs are mapped into deterministic AVAX pool metrics.
                  </div>
                </li>

                <li>
                  <b>Scoring Engine (External)</b>
                  <div className="text-slate-400 text-sm mt-1">
                    Risk scoring runs in the npm package
                    <span className="text-slate-100"> @crosswalk.pro/traxr-cts-avax</span>.
                  </div>
                </li>

                <li>
                  <b>Presentation & Distribution</b>
                  <div className="text-slate-400 text-sm mt-1">
                    Scores and warnings are surfaced via the UI and read-only API.
                  </div>
                </li>
              </ol>
            </section>

            <section className="mt-10 rounded-md border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg sm:text-xl font-medium">
                Read-Only by Design
              </h2>
              <p className="mt-3 text-slate-300">
                TRAXR-AVAX never signs transactions, never interacts with wallets,
                and never holds custody. All components operate in strict
                read-only mode.
              </p>
            </section>

            <section className="mt-10 rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-5">
              <h2 className="text-base sm:text-lg font-medium text-yellow-300">
                Current Alpha Architecture
              </h2>
              <ul className="mt-3 list-disc pl-5 text-slate-300 space-y-1">
                <li>Snapshot-based ingestion from GeckoTerminal</li>
                <li>Local JSON cache for repeatable runs</li>
                <li>Derived heuristics marked as best-effort</li>
                <li>Scoring logic isolated in npm package</li>
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                Roadmap (Optional)
              </h2>
              <ul className="mt-4 list-disc pl-5 text-slate-300 space-y-2">
                <li>On-chain pool address resolution</li>
                <li>Protocol-specific contract decoding</li>
                <li>Historical snapshots for trend analysis</li>
                <li>Cross-chain expansion</li>
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                Design Principles
              </h2>
              <ul className="mt-4 space-y-2 text-slate-300">
                <li><b>Indexing never guesses</b></li>
                <li><b>Scoring never rewrites facts</b></li>
                <li><b>Minimal scope and explicit TODOs</b></li>
                <li><b>Incremental, auditable rollout</b></li>
              </ul>
            </section>

            <p className="mt-12 text-xs text-slate-500">
              Architecture is introduced incrementally. Alpha components remain
              intentionally constrained to reduce systemic risk.
            </p>

            <div className="mt-14">
              <BackButton />
            </div>

            <p className="mt-8 text-sm text-slate-500">
              Know the system. Know the risk.
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
            <a href="/api-preview" className="hover:text-white">
              API (preview)
            </a>
            <a href="/data-model" className="hover:text-white">
              Data Model
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
