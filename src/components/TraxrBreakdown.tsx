import { useState } from "react";
import { TraxrNodeBreakdown } from "@/lib/types";

type Props = {
  nodes: TraxrNodeBreakdown;
};

const labels: Record<keyof TraxrNodeBreakdown, string> = {
  depth: "Liquidity Depth",
  activity: "Trading Activity",
  impact: "Volatility Impact",
  stability: "Fee Stability",
  trust: "Contract Risk",
  fee: "Dependencies",
};

const descriptions: Record<keyof TraxrNodeBreakdown, string> = {
  depth: "Estimated depth available for swaps",
  activity: "Observed usage relative to available liquidity",
  impact: "Price sensitivity under trade pressure",
  stability: "Fee consistency over time",
  trust: "Proxy/upgradeability/admin controls",
  fee: "Protocol dependency flags",
};

const detailTitles: Record<keyof TraxrNodeBreakdown, string> = {
  depth: "Liquidity Depth",
  activity: "Trading Activity",
  impact: "Volatility Impact",
  stability: "Fee Stability",
  trust: "Contract Risk",
  fee: "Dependencies",
};

const detailBodies: Record<keyof TraxrNodeBreakdown, string> = {
  depth:
    "Measures how much liquidity is practically available for swaps. Higher is generally better for execution quality.",
  activity:
    "Measures observed usage (volume and transactions) relative to available depth. Higher means healthier real usage.",
  impact:
    "Estimates sensitivity to trade pressure. Higher TRAXR node means lower expected disruption from trading flow.",
  stability:
    "Reflects fee behavior consistency. Higher means fee conditions are more predictable across snapshots.",
  trust:
    "Summarizes contract control posture (owner/admin/proxy style factors). Higher means lower governance/control risk.",
  fee:
    "Represents protocol dependency exposure signals. Higher means fewer dependency risk flags in the current model.",
};

// TRAXR node breakdown visualizes CTS-derived percentages for each dimension.
export function TraxrBreakdown({ nodes }: Props) {
  const [activeInfo, setActiveInfo] = useState<keyof TraxrNodeBreakdown | null>(
    null,
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/60">
        <span>TRAXR Nodes</span>
        <span>0 - 100</span>
      </div>
      <div className="space-y-3">
        {Object.entries(nodes).map(([key, value]) => {
          const pct = Math.max(0, Math.min(100, value));
          const width = `${pct}%`;
          const hue =
            pct >= 80
              ? "from-emerald-400/80 to-cyan-400/60"
              : pct >= 40
              ? "from-amber-400/80 to-orange-400/60"
              : "from-red-500/80 to-orange-500/60";
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm text-white/80">
                <div>
                  <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.2em] text-white/70">
                    <span>{labels[key as keyof TraxrNodeBreakdown]}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveInfo(key as keyof TraxrNodeBreakdown)
                      }
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/5 text-[9px] font-semibold text-white/70 transition hover:border-cyan-300/50 hover:text-cyan-100"
                      aria-label={`Explain ${labels[key as keyof TraxrNodeBreakdown]}`}
                    >
                      i
                    </button>
                  </div>
                  <div className="text-xs text-white/50">
                    {descriptions[key as keyof TraxrNodeBreakdown]}
                  </div>
                </div>
                <div className="text-sm font-semibold text-white">{pct}</div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full bg-gradient-to-r ${hue}`}
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {activeInfo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setActiveInfo(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0b1324]/95 p-4 text-white shadow-[0_0_30px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
                {detailTitles[activeInfo]}
              </div>
              <button
                type="button"
                onClick={() => setActiveInfo(null)}
                className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white/80 transition hover:border-white/35"
              >
                Close
              </button>
            </div>
            <div className="text-sm text-white/80">{detailBodies[activeInfo]}</div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">
              Current node score: {nodes[activeInfo]} / 100
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
