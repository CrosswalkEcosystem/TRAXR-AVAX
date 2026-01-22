import Image from "next/image";
import BackButton from "@/components/BackButton";

export const metadata = {
  title: "How TRAXR-AVAX Works - Methodology",
  description:
    "Transparent overview of TRAXR-AVAX scoring, data model, and alpha constraints.",
};

export default function MethodologyPage() {
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
                width={140}
                height={140}
                priority
                className="opacity-90"
              />
              <span className="text-xs tracking-wide text-slate-400 sm:text-sm">
                TRAXR-AVAX | Methodology
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              How TRAXR-AVAX Works
            </h1>
            <p className="mt-4 text-slate-400 text-sm tracking-wide">
              Pool & Contract Risk Intelligence (Alpha)
            </p>

            <section className="mt-12">
              <h2 className="text-lg sm:text-xl font-medium">What TRAXR-AVAX Is</h2>
              <p className="mt-3 text-slate-300">
                TRAXR-AVAX is a read-only, deterministic risk layer focused on
                AVAX pools and contract posture. It evaluates liquidity behavior
                and contract controls using transparent, placeholder heuristics.
              </p>
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                Why Pools, Not Tokens
              </h2>
              <p className="mt-3 text-slate-300">
                Risk in AMM environments emerges from liquidity depth, LP
                concentration, fee dynamics, and contract control. Pool-centric
                scoring surfaces where risk actually manifests.
              </p>
            </section>

            <section className="mt-10 rounded-md border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg sm:text-xl font-medium">
                What TRAXR-AVAX Is Not
              </h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>Not financial or investment advice</li>
                <li>Not a price prediction or yield forecast</li>
                <li>Not a trading interface or portfolio tracker</li>
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                TRAXR-AVAX Score
              </h2>
              <p className="mt-3 text-slate-300">
                Each AVAX pool receives a score (0-100), mapped to a 1-6 CTS node
                tier for UX and integrations. Scores are relative, temporal, and
                deterministic within the dataset.
              </p>
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                Scoring Dimensions
              </h2>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-slate-300">
                <li>
                  <span className="font-medium text-slate-200">
                    Liquidity Depth
                  </span>{" "}
                  - estimated reserves and resilience
                </li>
                <li>
                  <span className="font-medium text-slate-200">
                    Concentration
                  </span>{" "}
                  - LP dominance proxy
                </li>
                <li>
                  <span className="font-medium text-slate-200">
                    Volatility Impact
                  </span>{" "}
                  - price sensitivity
                </li>
                <li>
                  <span className="font-medium text-slate-200">
                    Fee Stability
                  </span>{" "}
                  - fee change consistency
                </li>
                <li>
                  <span className="font-medium text-slate-200">
                    Contract Risk
                  </span>{" "}
                  - proxy, upgradeability, admin controls
                </li>
                <li>
                  <span className="font-medium text-slate-200">
                    Dependencies
                  </span>{" "}
                  - incentives or emissions flags
                </li>
              </ul>
            </section>

            <section className="mt-8 rounded-md border border-cyan-400/20 bg-cyan-400/5 p-4">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
                Alpha Scoring Notes
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Several inputs are placeholders. Fee stability, concentration,
                and dependency flags are derived from simplified heuristics
                until live adapters are added.
              </p>
            </section>

            <section className="mt-10 rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-5">
              <h2 className="text-base sm:text-lg font-medium text-yellow-300">
                Current Alpha Data Model
              </h2>
              <p className="mt-3 text-slate-300">
                The current alpha operates in a showcase mode. Pool metadata is
                sourced from local JSON fixtures and refreshed manually.
              </p>
              <p className="mt-2 text-slate-300">
                This approach prioritizes correctness and transparency over
                perceived real-time behavior.
              </p>
            </section>

            <section className="mt-10">
              <h2 className="text-lg sm:text-xl font-medium">
                Roadmap (Optional)
              </h2>
              <p className="mt-3 text-slate-300">
                TRAXR-AVAX can evolve toward minimal on-chain reads and contract
                introspection while preserving the deterministic scoring model.
              </p>
            </section>

            <p className="mt-12 text-xs text-slate-500">
              Alpha mode: data is refreshed periodically for demonstration
              purposes. Real-time indexing is not enabled.
            </p>

            <div className="mt-14">
              <BackButton />
            </div>

            <p className="mt-8 text-sm text-slate-500">
              Know your pool. Know your risk.
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
            <a href="/architecture" className="hover:text-white">
              Architecture
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
            (c) 2025 Crosswalk Ecosystem LLC. All rights reserved.
          </div>
        </footer>
      </div>
    </main>
  );
}
