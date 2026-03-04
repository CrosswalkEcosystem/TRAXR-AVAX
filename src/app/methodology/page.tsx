import Image from "next/image";
import BackButton from "@/components/BackButton";

export const metadata = {
  title: "How TRAXR-AVAX Works - Methodology",
  description:
    "Avalanche-first methodology for deterministic pool-level risk indexing, normalization, and scoring.",
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

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Avalanche-First Deterministic Risk Methodology
            </h1>
            <p className="mt-4 text-sm tracking-wide text-slate-400">
              Pool-level risk intelligence from on-chain-native data, normalized and reproducible.
            </p>

            <section className="mt-12">
              <h2 className="text-lg font-medium sm:text-xl">Method Goal</h2>
              <p className="mt-3 text-slate-300">
                TRAXR-AVAX provides a deterministic pool-risk layer for Avalanche.
                The objective is not prediction; it is transparent interpretation of
                current pool structure and contract posture from source-backed data.
              </p>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-medium sm:text-xl">Data Source Policy</h2>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-slate-300">
                <li>Primary source: Avalanche C-Chain RPC (native on-chain reads/logs).</li>
                <li>Legacy Gecko snapshots are retained as baseline comparison data.</li>
                <li>Trend/Compare explicitly show source segmentation for provenance transparency.</li>
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-medium sm:text-xl">Deterministic Pipeline</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-slate-300">
                <li>
                  Discovery per DEX adapter using protocol-specific events/state.
                </li>
                <li>
                  Normalization into stable schema (`dataSource`, `addressSource`, pool/token fields, metrics).
                </li>
                <li>
                  Scoring delegation to external npm engine (`@crosswalk.pro/traxr-cts-avax`).
                </li>
                <li>
                  Distribution via read-only API/UI with explicit `Signals` semantics.
                </li>
              </ol>
            </section>

            <section className="mt-10 rounded-md border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-medium sm:text-xl">Scoring Semantics</h2>
              <p className="mt-3 text-slate-300">
                Node outputs are normalized to `0-100` where higher means better posture.
                For example, <span className="text-slate-100">Execution Resilience</span> is
                positive quality: higher indicates lower expected disruption under trade pressure.
              </p>
              <p className="mt-2 text-slate-300">
                Public scoring principles are documented in{" "}
                <a href="/scoring-overview" className="underline decoration-dashed underline-offset-4 decoration-white/40 hover:decoration-cyan-300 transition">
                  Scoring Overview
                </a>.
              </p>
            </section>

            <section className="mt-10 rounded-md border border-cyan-400/20 bg-cyan-400/5 p-4">
              <h2 className="text-lg font-medium sm:text-xl">MVP Scope</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>Avalanche-native snapshot fetcher (adapter-based).</li>
                <li>Deterministic normalization + pool-level scoring outputs.</li>
                <li>UI/API for pool, trend, compare, signals, and interpretation.</li>
              </ul>
            </section>

            <section className="mt-10 rounded-md border border-amber-400/25 bg-amber-400/5 p-4">
              <h2 className="text-lg font-medium sm:text-xl">Next Build Focus</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>Self-hosted Avalanche node as primary data plane.</li>
                <li>Smarter/faster indexer profiles for high-frequency refresh.</li>
                <li>Deeper contract/admin/dependency signal coverage.</li>
                <li>Integration-ready API distribution for wallets and DEXs.</li>
              </ul>
            </section>

            <section className="mt-10 rounded-md border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-medium sm:text-xl">What TRAXR-AVAX Is Not</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>Not financial advice.</li>
                <li>Not a trading execution interface.</li>
                <li>Not custody/signing infrastructure.</li>
              </ul>
            </section>

            <p className="mt-12 text-xs text-slate-500">
              Methodology is intentionally explicit so outputs remain auditable and reproducible.
            </p>

            <div className="mt-14">
              <BackButton />
            </div>
          </div>
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://github.com/CrosswalkEcosystem/TRAXR-AVAX"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              GitHub
            </a>
            <a href="/architecture" className="hover:text-white">
              Architecture
            </a>
            <a href="/scoring-overview" className="hover:text-white">
              Scoring overview
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
