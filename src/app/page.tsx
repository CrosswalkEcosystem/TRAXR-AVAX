"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { TraxrDashboard } from "@/components/TraxrDashboard";
import { TraxrScoreResult } from "@/lib/types";
import { RollingStats } from "@/components/RollingStats";

const featureEnabled =
  (process.env.NEXT_PUBLIC_TRAXR_ENABLED ?? "true") === "true";
const maintenanceMode =
  (process.env.NEXT_PUBLIC_TRAXR_MAINTENANCE ?? "true") === "true";

export default function Home() {
  const [pools, setPools] = useState<TraxrScoreResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPools() {
      setLoading(true);
      setError(null);
      setLogs([
        "[TRAXR-AVAX] Loading cached AVAX pools (local bundle)...",
        "[TRAXR-AVAX] Normalizing pools...",
        "[TRAXR-AVAX] Scoring pools...",
      ]);

      try {
        const res = await fetch("/api/traxr/pools", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!isMounted) return;
        setPools(Array.isArray(json) ? json : []);
        setLogs((prev) => [
          ...prev,
          `[TRAXR-AVAX] Loaded ${Array.isArray(json) ? json.length : 0} pools from cache`,
        ]);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || "Failed to load pools");
        setLogs((prev) => [...prev, `[TRAXR-AVAX] Error: ${e?.message || e}`]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPools();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-10 lg:px-16">
      <div className="pointer-events-none absolute inset-0 gridlines opacity-40" />

      <div
        className={`relative mx-auto flex max-w-6xl flex-col gap-10 text-white transition ${
          maintenanceMode ? "pointer-events-none select-none blur-sm" : ""
        }`}
        aria-hidden={maintenanceMode}
      >
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1220]/90 via-[#0f1f36]/70 to-[#0b0f1d]/80 p-6 sm:p-8 shadow-[0_0_80px_rgba(0,255,255,0.14)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,255,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(0,180,255,0.12),transparent_28%)]" />

          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            {/* LEFT: TEXT + SYSTEM STATE */}
            <div className="space-y-4 lg:w-7/12 xl:w-2/3">
              <div
                className="w-full overflow-hidden rounded-full border border-cyan-400/50 bg-cyan-500/10 px-[clamp(0.15rem,0.35vw,0.45rem)] py-[clamp(0.08rem,0.25vw,0.35rem)] text-center whitespace-nowrap"
                style={{ borderWidth: "clamp(0.6px, 0.25vw, 1.2px)" }}
              >
                <span
                  className="text-cyan-100 opacity-80"
                  style={{
                    fontSize: "clamp(0.48rem, 0.95vw, 1.4rem)",
                    letterSpacing: "clamp(0.01em, 0.28vw, 0.12em)",
                  }}
                >
                  TRAXR-AVAX | Pool & Contract Risk Intelligence (Alpha)
                </span>
              </div>

              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                AVAX pools, indexed and normalized for verifiable analytics.
              </h1>

              <p className="max-w-2xl text-lg text-white/70">
                TRAXR-AVAX ingests AVAX pool data from Avalanche-native RPC,
                normalizes the inputs, and exposes a clean substrate for downstream scoring.
              </p>

              <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Avalanche RPC snapshots (local cache)
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Derived heuristics (best-effort)
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Scoring engine decoupled (npm)
                </span>
              </div>

              {!loading && !error && pools.length > 0 && (
                <div className="relative pt-6">
                  <div className="absolute -top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                  <RollingStats pools={pools} />
                </div>
              )}

              <div className="mt-6 flex justify-center">
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-white/60">
                  <a
                    href="/methodology"
                    className="underline decoration-dashed underline-offset-4 decoration-white/40 hover:decoration-cyan-300 transition"
                  >
                    Methodology
                  </a>
                  <span className="hidden text-white/40 sm:inline">|</span>
                  <a
                    href="/scoring-overview"
                    className="underline decoration-dashed underline-offset-4 decoration-white/40 hover:decoration-cyan-300 transition"
                  >
                    Scoring overview
                  </a>
                  <span className="hidden text-white/40 sm:inline">|</span>
                  <a
                    href="/architecture"
                    className="underline decoration-dashed underline-offset-4 decoration-white/40 hover:decoration-cyan-300 transition"
                  >
                    Architecture
                  </a>
                  <span className="hidden text-white/40 sm:inline">|</span>
                  <a
                    href="/api-preview"
                    className="underline decoration-dashed underline-offset-4 decoration-white/40 hover:decoration-cyan-300 transition"
                  >
                    API (preview)
                  </a>
                  <span className="hidden text-white/40 sm:inline">|</span>
                  <a
                    href="/data-model"
                    className="underline decoration-dashed underline-offset-4 decoration-white/40 hover:decoration-cyan-300 transition"
                  >
                    Data model
                  </a>
                </div>
              </div>
            </div>

            {/* RIGHT: LOGO */}
            <div className="order-2 flex lg:order-none lg:w-5/12 xl:w-1/3 items-center justify-center lg:justify-end lg:min-h-[320px]">
              <div className="relative h-48 sm:h-56 lg:h-80 xl:h-96 w-full max-w-[640px]">
                <Image
                  src="/images/TRAXR.png"
                  alt="TRAXR-AVAX"
                  fill
                  priority
                  className="object-contain drop-shadow-[0_0_36px_rgba(0,255,255,0.55)]"
                  sizes="(min-width: 1280px) 640px, (min-width: 1024px) 520px, (min-width: 768px) 420px, 320px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT */}
        {loading ? (
          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/70 border-t-transparent" />
              <div className="text-lg font-semibold">Loading pools...</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-mono text-white/70">
              {logs.map((line, idx) => (
                <div key={`${line}-${idx}`}>{line}</div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-100">
            Failed to load pools: {error}
          </div>
        ) : featureEnabled ? (
          <TraxrDashboard pools={pools} />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white/70">
            TRAXR-AVAX is disabled by flag.
          </div>
        )}

        {/* FOOTER */}
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
            <a href="/methodology" className="hover:text-white">
              Methodology
            </a>
            <a href="/scoring-overview" className="hover:text-white">
              Scoring overview
            </a>
            <a href="/architecture" className="hover:text-white">
              Architecture
            </a>
            <a href="/api-preview" className="hover:text-white">
              API (preview)
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

      {maintenanceMode ? (
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center px-6 pt-8 sm:pt-10">
          <div className="w-full max-w-2xl rounded-3xl border border-amber-300/30 bg-[#08111d]/78 px-8 py-8 text-center shadow-[0_0_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="text-xs font-semibold uppercase tracking-[0.38em] text-amber-200/80">
              Under Maintenance
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              TRAXR-AVAX is temporarily unavailable
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/70 sm:text-base">
              We are recalculating pool snapshots and validating the AVAX fetch
              pipeline. The dashboard will return once the data refresh is verified.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
