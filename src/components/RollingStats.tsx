"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------------------------------- */
/* Count-up hook                      */
/* ---------------------------------- */

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

/* ---------------------------------- */
/* Stat bubble                        */
/* ---------------------------------- */

function Bubble({ label, value }: { label: string; value: number }) {
  const animated = useCountUp(value);

  return (
    <div
      className="
        relative isolate
        z-0 hover:z-30
        flex aspect-square w-[72px] sm:w-[84px] md:w-[96px]
        flex-col items-center justify-center gap-1
        rounded-2xl border border-white/10
        bg-white/5 backdrop-blur
        transition
        hover:border-cyan-400/40
        hover:shadow-[0_0_18px_rgba(0,255,255,0.15)]
      "
    >
      <div className="text-lg sm:text-xl font-semibold text-cyan-300 tabular-nums">
        {animated.toLocaleString()}
      </div>

      <div className="flex items-center gap-1 text-[9px] sm:text-[10px] uppercase tracking-wider text-white/60">
        <span>{label}</span>
      </div>
    </div>
  );
}

/* ---------------------------------- */
/* Rolling stats HUD                  */
/* ---------------------------------- */

export function RollingStats({
  pools,
}: {
  pools: {
    warnings?: string[];
    score?: number;
    poolAddress?: string;
    metrics?: {
      poolAddress?: string;
    };
  }[];
}) {
  const [showInfo, setShowInfo] = useState(false);
  const totalPools = pools.length;

  const scores = useMemo(
    () => pools.map((p) => p.score ?? 100).sort((a, b) => a - b),
    [pools],
  );

  const cutoff = scores[Math.floor(scores.length * 0.25)] ?? 0;

  const elevated = pools.filter((p) => (p.score ?? 100) <= cutoff).length;

  const signals = pools.filter(
    (p) => (p.warnings ?? []).some((w) => !w.toLowerCase().startsWith("info")),
  ).length;

  const contracts = new Set(
    pools
      .map((p) => p.poolAddress ?? p.metrics?.poolAddress)
      .filter(Boolean),
  ).size;

  const items = [
    {
      key: "pools",
      label: "Pools",
      value: totalPools,
      description:
        "AVAX pools included in the current indexed snapshot (source-backed, not full network coverage).",
    },
    {
      key: "signals",
      label: "Signals",
      value: signals,
      description:
        "Pools with at least one warning emitted by the scoring engine for this snapshot.",
    },
    {
      key: "elevated",
      label: "Elevated",
      value: elevated,
      description:
        "Bottom quartile by score within this dataset. Relative positioning only, not an absolute verdict.",
    },
    {
      key: "contracts",
      label: "Contracts",
      value: contracts,
      description:
        "Unique pool contract addresses resolved in the snapshot.",
    },
  ];

  return (
    <section className="relative w-full px-2 py-3 overflow-visible">
      <div className="flex justify-center gap-3 sm:gap-4">
        {items.map((item) => (
          <Bubble key={item.key} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="mt-2 text-center text-[9px] sm:text-[10px] text-white/45">
        Snapshot of ~{totalPools.toLocaleString()} pools | AVAX C-Chain | Indexed + normalized data
      </div>

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-[6px] text-[10px] uppercase tracking-wide text-white/60 transition hover:border-cyan-400/40 hover:text-white/80 shadow-sm shadow-black/20"
        >
          info
        </button>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0b1220]/95 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">What the bubbles mean</h3>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:border-cyan-400/40 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-white/80">
              {items.map((item) => (
                <div key={item.key}>
                  <span className="font-semibold text-cyan-200">{item.label}:</span>{" "}
                  {item.description}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
