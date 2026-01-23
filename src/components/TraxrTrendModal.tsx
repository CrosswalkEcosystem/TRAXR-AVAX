"use client";

import { useEffect, useState } from "react";
import { TraxrScoreResult, TraxrTrendPoint } from "@/lib/types";

type Props = {
  open: boolean;
  pool?: TraxrScoreResult | null;
  onClose: () => void;
};

export function TraxrTrendModal({ open, pool, onClose }: Props) {
  const [trend, setTrend] = useState<TraxrTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !pool?.poolId) return;
    setLoading(true);
    fetch(`/api/traxr/pool-trend?poolId=${encodeURIComponent(pool.poolId)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        setTrend(Array.isArray(data) ? data : []);
      })
      .catch(() => setTrend([]))
      .finally(() => setLoading(false));
  }, [open, pool?.poolId]);

  if (!open || !pool) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
      <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-[#0b1220] p-5 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.26em] text-white/60">
              Pool Trend
            </div>
            <div className="text-sm text-white/60">
              {poolLabel(pool)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-sm text-white/70">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/70 border-t-transparent" />
            Loading trend data...
          </div>
        ) : trend.length ? (
          <div className="max-h-[60vh] overflow-auto rounded-2xl border border-white/10 bg-black/30">
            <table className="w-full text-left text-xs text-white/70">
              <thead className="sticky top-0 bg-[#0b1220] text-[10px] uppercase tracking-[0.2em] text-white/40">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Liquidity</th>
                  <th className="px-3 py-2">24h Volume</th>
                  <th className="px-3 py-2">Concentration</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((point) => (
                  <tr key={point.timestamp} className="border-t border-white/5">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(point.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{point.score.toFixed(0)}</td>
                    <td className="px-3 py-2">
                      {(point.metrics.liquidityUsd ?? 0).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      USD
                    </td>
                    <td className="px-3 py-2">
                      {(point.metrics.volume24hUsd ?? 0).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      USD
                    </td>
                    <td className="px-3 py-2">
                      {typeof point.metrics.liquidityConcentrationPct === "number" ? (
                        `${point.metrics.liquidityConcentrationPct.toFixed(0)}%`
                      ) : (
                        <span title="Requires additional on-chain analysis resolved by the TRAXR scoring engine.">
                          Unknown
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
            No trend data available. Add snapshot files to `data/avaxPools_*.json`.
          </div>
        )}
      </div>
    </div>
  );
}

function poolLabel(p: TraxrScoreResult) {
  const m: any = p.metrics || {};
  const tokA = tokenDisplay({
    mint: m.mintA,
    tokenName: m.tokenAName || p.tokenAName,
    tokenSymbol: m.tokenASymbol || p.tokenASymbol,
    tokenAddress: m.tokenAAddress,
  });
  const tokB = tokenDisplay({
    mint: m.mintB,
    tokenName: m.tokenBName || p.tokenBName,
    tokenSymbol: m.tokenBSymbol || p.tokenBSymbol,
    tokenAddress: m.tokenBAddress,
  });
  return tokB ? `${tokA}/${tokB}` : tokA;
}

function tokenDisplay(opts: {
  mint?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
}) {
  const { mint, tokenName, tokenSymbol, tokenAddress } = opts;
  if (!mint && !tokenName && !tokenSymbol) return null;
  if (mint === "SINGLE") return null;
  const base = tokenSymbol || tokenName || mint || "Token";
  const address = tokenAddress || mint;
  if (address && address.startsWith("0x") && address.length > 12) {
    const short = `${address.slice(0, 4)}...${address.slice(-4)}`;
    return `${base} (${short})`;
  }
  return base;
}
