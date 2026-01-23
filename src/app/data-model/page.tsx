import Image from "next/image";
import BackButton from "@/components/BackButton";
import TraxrDataModelMap from "@/components/TraxrDataModelMap";

export const metadata = {
  title: "TRAXR-AVAX Data Model",
  description:
    "Overview of the AVAX pool and contract data model used by TRAXR-AVAX for indexing and scoring.",
};

export default function DataModelPage() {
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
                TRAXR-AVAX | Data Model
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              TRAXR-AVAX Data Model
            </h1>
            <p className="mt-4 text-slate-400 text-sm tracking-wide">
              Indexed AVAX pool entities used for normalization and scoring.
            </p>

            <section className="mt-12">
              <h2 className="text-lg sm:text-xl font-medium">
                Data Model Overview
              </h2>
              <p className="mt-3 text-slate-300">
                TRAXR-AVAX operates on a read-only data model derived from
                AVAX C-Chain pool inputs. The model separates source-backed
                fields from derived heuristics and external scoring signals.
              </p>
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                Core Entities
              </h2>
              <ul className="mt-4 space-y-3 text-slate-300">
                <li>
                  <b>Pool Contract</b>
                  <div className="text-slate-400 text-sm mt-1">
                    Pool address, identifiers, DEX attribution, and fee metadata.
                  </div>
                </li>
                <li>
                  <b>Token Metadata</b>
                  <div className="text-slate-400 text-sm mt-1">
                    Token name, symbol, address, and decimals from the source feed.
                  </div>
                </li>
                <li>
                  <b>Snapshot</b>
                  <div className="text-slate-400 text-sm mt-1">
                    Point-in-time capture of liquidity and volume metrics.
                  </div>
                </li>
              </ul>
            </section>

            <section className="mt-12">
              <h2 className="text-lg sm:text-xl font-medium">
                Deterministic Data Model
              </h2>
              <p className="mt-3 text-slate-300">
                All TRAXR-AVAX scores are derived from a single snapshot. No
                predictions, no trading features, and no wallet interactions.
              </p>
              <TraxrDataModelMap />
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                Derived Metrics
              </h2>
              <p className="mt-3 text-slate-300">
                From core entities, TRAXR-AVAX derives normalized heuristics
                such as liquidity depth and volatility impact. These are marked
                as best-effort and never presented as protocol guarantees.
              </p>
            </section>

            <section className="mt-10 rounded-md border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg sm:text-xl font-medium">
                Scoring Signals (External)
              </h2>
              <p className="mt-3 text-slate-300">
                Advanced signals such as liquidity concentration, fee stability,
                and governance risk are produced by the scoring engine package.
                Unknown values are intentional until resolved by that layer.
              </p>
            </section>

            <section className="mt-10 rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-5">
              <h2 className="text-base sm:text-lg font-medium text-yellow-300">
                Current Alpha Data Model
              </h2>
              <ul className="mt-3 list-disc pl-5 text-slate-300 space-y-1">
                <li>GeckoTerminal snapshots cached in JSON</li>
                <li>Manual refresh cycle for validation</li>
                <li>Deterministic normalization over cached state</li>
                <li>Scoring handled by npm package</li>
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                Evolution (Optional)
              </h2>
              <p className="mt-3 text-slate-300">
                The target data model can evolve toward continuous indexing and
                automated ingestion without altering core entity definitions.
              </p>
            </section>

            <p className="mt-12 text-xs text-slate-500">
              Data structures are intentionally minimal to preserve auditability
              and reduce complexity during alpha.
            </p>

            <div className="mt-14">
              <BackButton />
            </div>

            <p className="mt-8 text-sm text-slate-500">
              Know the data. Know the risk.
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
            <a href="/api-preview" className="hover:text-white">
              API (preview)
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
            (c) 2025 Crosswalk Ecosystem LLC. All rights reserved.
          </div>
        </footer>
      </div>
    </main>
  );
}
