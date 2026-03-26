import Image from "next/image";
import BackButton from "@/components/BackButton";

export const metadata = {
  title: "TRAXR-AVAX Scoring Overview",
  description:
    "Public high-level overview of TRAXR-AVAX scoring methodology without exposing private package internals.",
};

export default function ScoringOverviewPage() {
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
                TRAXR-AVAX | Scoring Overview
              </span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How TRAXR Score Is Computed (Public View)
            </h1>
            <p className="mt-4 text-sm tracking-wide text-slate-400">
              Deterministic, pool-level scoring from normalized on-chain Avalanche data.
            </p>

            <section className="mt-12">
              <h2 className="text-lg font-medium sm:text-xl">Scoring Input</h2>
              <p className="mt-3 text-slate-300">
                TRAXR consumes normalized pool metrics (liquidity depth, activity context,
                reserve imbalance, execution resilience context, fee stability, contract posture, dependencies)
                and computes deterministic node values and final score.
              </p>
              <p className="mt-3 text-slate-300">
                Reserve imbalance is derived from full-pool USD reserve composition so the metric
                stays comparable across V2, V3, LB, and Balancer-style pools.
              </p>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-medium sm:text-xl">Node Model</h2>
              <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-slate-300 sm:grid-cols-2">
                <li>Liquidity Depth</li>
                <li>Trading Activity</li>
                <li>Execution Resilience</li>
                <li>Fee Stability</li>
                <li>Contract Risk</li>
                <li>Dependencies</li>
              </ul>
              <p className="mt-3 text-slate-300">
                Node scores are normalized to `0-100`, where higher means better posture.
              </p>
            </section>

            <section className="mt-10 rounded-md border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-medium sm:text-xl">Determinism Rules</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>Same input snapshot always returns the same score.</li>
                <li>No manual hidden overrides.</li>
                <li>Unknown inputs remain explicit; they are not silently guessed.</li>
                <li>Source provenance remains visible in UI/API.</li>
              </ul>
            </section>

            <section className="mt-10 rounded-md border border-cyan-400/20 bg-cyan-400/5 p-4">
              <h2 className="text-lg font-medium sm:text-xl">Private vs Public</h2>
              <p className="mt-3 text-slate-300">
                Public docs explain scoring principles and interpretation semantics.
                Private package internals (exact weighting constants and implementation details)
                are intentionally not disclosed.
              </p>
            </section>

            <div className="mt-14">
              <BackButton />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
