import { TraxrScoreResult } from "@/lib/types";
import { useMemo, useState } from "react";
import { TraxrRadarGraph } from "./TraxrRadarGraph";

type Props = {
  pools: TraxrScoreResult[];
  selected?: TraxrScoreResult | null;
  onSelect?: (pool: TraxrScoreResult) => void;
};

// TRAXR trust map groups pools strictly by CTS tier; no redistribution.
export function TraxrTrustMap({ pools, selected, onSelect }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const tiers = Array.from({ length: 6 }, (_, i) => i + 1);

  const uniquePools = useMemo(
    () => Array.from(new Map(pools.map((p) => [p.poolId, p])).values()),
    [pools],
  );

  const byTier = useMemo(() => {
    const map = new Map<number, TraxrScoreResult[]>();
    tiers.forEach((t) => map.set(t, []));
    uniquePools.forEach((pool) => {
      const tier = Math.max(1, Math.min(6, pool.ctsNodes || Math.round(pool.score / 20)));
      const list = map.get(tier) || [];
      list.push(pool);
      map.set(tier, list);
    });
    return map;
  }, [uniquePools, tiers]);

  const hero = selected || uniquePools[0];
  const getTierItems = (tier: number, limit?: number) => {
    const arr = [...(byTier.get(tier) || [])].sort(
      (a, b) =>
        (b.metrics?.liquidityUsd ?? 0) - (a.metrics?.liquidityUsd ?? 0) ||
        (b.score ?? 0) - (a.score ?? 0),
    );
    return typeof limit === "number" ? arr.slice(0, limit) : arr;
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#0f1b2d] to-[#0f172a] p-4 sm:p-5 lg:p-6 shadow-[0_0_60px_rgba(0,255,255,0.08)] overflow-hidden">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.26em] text-cyan-200/70">Trust Map</div>
            <div className="text-sm text-white/70">CTS tiering across AVAX pools</div>
          </div>
          <div className="text-xs text-white/60">Top by tier - max 4 each</div>
        </div>
        {hero ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)] lg:flex-row lg:items-center lg:gap-6">
            <div className="flex-1 space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-white/60">Selected pool</div>
              <div className="min-w-0 text-lg font-semibold text-white truncate">
                {poolLabel(hero)}
              </div>
              <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-white/70">
                <span>Score {Math.round(hero.score)}</span>
                <span>
                  24h Vol {" "}
                  {(hero.metrics?.volume24hUsd ?? 0).toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  USD
                </span>
                <span>
                  Liq {" "}
                  {(hero.metrics?.liquidityUsd ?? 0).toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  USD
                </span>
              </div>
              <div className="text-[11px] text-white/50">
                Updated {hero.updatedAt ? new Date(hero.updatedAt).toLocaleString() : "n/a"}
              </div>
              <div className="mt-2 text-[11px] text-white/60 leading-relaxed">
                Legend: center number = TRAXR score; vertices = CTS nodes (depth, concentration, impact, fee stability, contract, dependencies).
              </div>
            </div>
            <div className="flex-1">
              <TraxrRadarGraph nodes={hero.nodes} score={hero.score} size={240} />
            </div>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => {
          const items = getTierItems(tier, 4);
          const bg =
            tier >= 5
              ? "border-emerald-400/50"
              : tier >= 3
              ? "border-amber-400/40"
              : "border-red-400/40";
          return (
            <div
              key={tier}
              className={`rounded-2xl border ${bg} bg-white/5 p-3 backdrop-blur overflow-hidden w-full`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.26em] text-white/60">CTS {tier}</div>
                <div className="text-[11px] text-white/40">{items.length ? "Active" : "Empty"}</div>
              </div>
              <div className="space-y-1">
                {items.length === 0 ? (
                  <div className="text-sm text-white/40">No pools in tier</div>
                ) : (
                  items.map((pool, idx) => {
                    const m: any = pool.metrics || {};
                    const liq = m.liquidityUsd ?? 0;
                    const nameA = tokenDisplay({
                      mint: m.mintA,
                      tokenName: m.tokenAName || pool.tokenAName,
                      tokenSymbol: m.tokenASymbol || pool.tokenASymbol,
                      tokenAddress: m.tokenAAddress,
                    });
                    const nameB = tokenDisplay({
                      mint: m.mintB,
                      tokenName: m.tokenBName || pool.tokenBName,
                      tokenSymbol: m.tokenBSymbol || pool.tokenBSymbol,
                      tokenAddress: m.tokenBAddress,
                    });
                    const key = pool.poolId || `${tier}-${m.mintA || "A"}-${m.mintB || "B"}-${idx}`;
                    return (
                      <div
                        key={key}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                        onClick={() => {
                          onSelect?.(pool);
                          document
                            .getElementById("traxr-selected-card")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        <span className="flex-1 min-w-0 max-w-[70%] truncate text-white/80">
                          {nameB ? `${nameA}/${nameB}` : nameA}
                        </span>
                        <span className="shrink-0 text-white/60">
                          Liq {liq.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-end gap-3">
        <button
          onClick={() => setShowModal(true)}
          className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_14px_rgba(0,255,255,0.25)] hover:border-cyan-300 hover:text-white transition"
        >
          Show more
        </button>
        <button
          onClick={() => setShowGraph(true)}
          className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 shadow-[0_0_14px_rgba(0,255,180,0.25)] hover:border-emerald-300 hover:text-white transition"
        >
          TrustGRAPH
        </button>
      </div>
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.26em] text-cyan-200/70">
                  All pools by CTS tier
                </div>
                <div className="text-sm text-white/60">Scrollable view and click to select</div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <div className="flex max-h-[70vh] gap-3 overflow-x-auto overflow-y-hidden pr-2">
              {tiers.map((tier) => {
                const items = getTierItems(tier);
                return (
                  <div
                    key={`modal-${tier}`}
                    className="flex min-w-[220px] max-w-[260px] flex-col rounded-2xl border border-white/10 bg-white/5"
                  >
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-[#0b1220]/80 px-3 py-2 backdrop-blur">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <img
                          src={`/images/cts${tier}.png`}
                          alt={`CTS ${tier}`}
                          className="h-6 w-6 object-contain"
                        />
                        CTS {tier}
                      </div>
                      <div className="text-[11px] text-white/50">{items.length} pools</div>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
                      {items.map((pool, idx) => {
                        const m: any = pool.metrics || {};
                        const nameA = tokenDisplay({
                          mint: m.mintA,
                          tokenName: m.tokenAName || pool.tokenAName,
                          tokenSymbol: m.tokenASymbol || pool.tokenASymbol,
                          tokenAddress: m.tokenAAddress,
                        });
                        const nameB = tokenDisplay({
                          mint: m.mintB,
                          tokenName: m.tokenBName || pool.tokenBName,
                          tokenSymbol: m.tokenBSymbol || pool.tokenBSymbol,
                          tokenAddress: m.tokenBAddress,
                        });
                        const liq = m.liquidityUsd ?? 0;
                        return (
                          <div
                            key={`${pool.poolId || idx}-modal`}
                            className="rounded-xl bg-black/30 p-2 text-xs text-white/80 transition hover:bg-white/10 cursor-pointer"
                            onClick={() => {
                              onSelect?.(pool);
                              setShowModal(false);
                              setTimeout(() => {
                                document
                                  .getElementById("traxr-selected-card")
                                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }, 50);
                            }}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="truncate pr-2">{nameB ? `${nameA}/${nameB}` : nameA}</span>
                              <span className="shrink-0 text-white/60">
                                Liq {liq.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      {showGraph ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.26em] text-emerald-200/70">
                  TrustGRAPH - pools mapped by CTS tier
                </div>
                <div className="text-sm text-white/60">Size = liquidity | Y = score | X = CTS tier</div>
              </div>
              <button
                onClick={() => setShowGraph(false)}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4">
              <TierGraph pools={uniquePools} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
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
  return tokB ? `${tokA} / ${tokB}` : tokA;
}

function TierGraph({ pools }: { pools: TraxrScoreResult[] }) {
  if (!pools.length) return null;
  const [hovered, setHovered] = useState<{ label: string; sx: number; sy: number } | null>(null);
  const [showLegendInfo, setShowLegendInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [pendingZoom, setPendingZoom] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const width = 1100;
  const height = 520;
  const padding = { left: 60, right: 40, top: 40, bottom: 60 };
  const maxScore = 100;
  const maxLiq = Math.max(...pools.map((p) => p.metrics?.liquidityUsd ?? 0), 1);

  const clampPan = (nextTx: number, nextTy: number, nextZoom: number) => {
    const maxOffsetX = 0;
    const minOffsetX = width - width * nextZoom;
    const maxOffsetY = 0;
    const minOffsetY = height - height * nextZoom;
    return {
      tx: Math.min(maxOffsetX, Math.max(minOffsetX, nextTx)),
      ty: Math.min(maxOffsetY, Math.max(minOffsetY, nextTy)),
    };
  };

  const points = pools.map((p) => {
    const tier = Math.max(1, Math.min(6, p.ctsNodes || Math.round(p.score / 20)));
    const score = p.score ?? 0;
    const liq = p.metrics?.liquidityUsd ?? 0;
    const size = Math.max(6, (Math.log10(liq + 1) / Math.log10(maxLiq + 1)) * 22);
    const x =
      padding.left +
      ((tier - 1) / 5) * (width - padding.left - padding.right);
    const y =
      padding.top +
      (1 - score / maxScore) * (height - padding.top - padding.bottom);
    return { x, y, tier, score, size, label: poolLabel(p) };
  });

  const tiers = Array.from({ length: 6 }, (_, i) => i + 1);
  const tierStats = tiers
    .map((t) => {
      const tierPoints = points.filter((p) => p.tier === t);
      if (!tierPoints.length) return null;
      const x =
        padding.left +
        ((t - 1) / 5) * (width - padding.left - padding.right);

      const scores = tierPoints.map((p) => p.score).sort((a, b) => a - b);
      const midIdx = Math.floor(scores.length / 2);
      const median =
        scores.length % 2 === 0
          ? (scores[midIdx - 1] + scores[midIdx]) / 2
          : scores[midIdx];
      const p90 = scores[Math.min(scores.length - 1, Math.floor(scores.length * 0.9))];

      const weightSum = tierPoints.reduce((sum, p) => sum + p.size, 0) || 1;
      const avgScore =
        tierPoints.reduce((sum, p) => sum + p.score * p.size, 0) / weightSum;

      const yFor = (val: number) =>
        padding.top +
        (1 - val / maxScore) * (height - padding.top - padding.bottom);

      return { x, yAvg: yFor(avgScore), yMed: yFor(median), yP90: yFor(p90), avgScore, median, p90 };
    })
    .filter(Boolean) as { x: number; yAvg: number; yMed: number; yP90: number; avgScore: number; median: number; p90: number }[];

  const curvePath =
    tierStats.length > 1
      ? catmullRomToBezier(tierStats.map(({ x, yAvg }) => ({ x, y: yAvg }))).map((c, i) =>
          `${i === 0 ? "M" : "C"} ${c.join(" ")}`,
        ).join(" ")
      : "";

  const medianPath =
    tierStats.length > 1
      ? catmullRomToBezier(tierStats.map(({ x, yMed }) => ({ x, y: yMed }))).map((c, i) =>
          `${i === 0 ? "M" : "C"} ${c.join(" ")}`,
        ).join(" ")
      : "";

  const p90Path =
    tierStats.length > 1
      ? catmullRomToBezier(tierStats.map(({ x, yP90 }) => ({ x, y: yP90 }))).map((c, i) =>
          `${i === 0 ? "M" : "C"} ${c.join(" ")}`,
        ).join(" ")
      : "";

  const mapXScreen = (tier: number) => {
    const worldX =
      padding.left + ((tier - 1) / 5) * (width - padding.left - padding.right);
    return worldX * zoom + tx;
  };
  const mapYScreen = (score: number) => {
    const worldY =
      padding.top +
      (1 - score / maxScore) * (height - padding.top - padding.bottom);
    return worldY * zoom + ty;
  };

  return (
    <div className="relative space-y-2">
      <div className="flex items-center justify-end gap-2 text-xs text-white/70">
        <span>Zoom</span>
        <button
          onClick={() => setPendingZoom(true)}
          className={`rounded-full border border-white/20 px-2 py-1 ${
            pendingZoom ? "bg-emerald-500/30 text-white" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          +
        </button>
        <button
          onClick={() => {
            setZoom((z) => Math.max(1, z / 1.25));
            setTx(0);
            setTy(0);
            setPendingZoom(false);
          }}
          className="rounded-full border border-white/20 bg-white/10 px-2 py-1 hover:bg-white/20"
        >
          -
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setTx(0);
            setTy(0);
            setPendingZoom(false);
          }}
          className="rounded-full border border-white/20 bg-white/10 px-2 py-1 hover:bg-white/20"
        >
          Reset
        </button>
        <span className="text-white/50">
          {pendingZoom ? "Tap to zoom at point" : "Drag to pan | click + to zoom"}
        </span>
      </div>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-white/60"
        shapeRendering="geometricPrecision"
        style={{
          cursor: pendingZoom ? "zoom-in" : dragging ? "grabbing" : "grab",
        }}
        onMouseDown={(e) => {
          setDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY, tx, ty });
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onMouseMove={(e) => {
          if (!dragging || !dragStart) return;
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          const next = clampPan(dragStart.tx + dx, dragStart.ty + dy, zoom);
          setTx(next.tx);
          setTy(next.ty);
        }}
        onClick={(e) => {
          if (!pendingZoom) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * width;
          const y = ((e.clientY - rect.top) / rect.height) * height;
          const worldX = (x - tx) / zoom;
          const worldY = (y - ty) / zoom;
          const nextZoom = Math.min(4, zoom * 1.5);
          setZoom(nextZoom);
          const nextPan = clampPan(width / 2 - worldX * nextZoom, height / 2 - worldY * nextZoom, nextZoom);
          setTx(nextPan.tx);
          setTy(nextPan.ty);
          setPendingZoom(false);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          setDragging(true);
          setDragStart({ x: t.clientX, y: t.clientY, tx, ty });
        }}
        onTouchEnd={() => setDragging(false)}
        onTouchMove={(e) => {
          if (!dragging || !dragStart) return;
          const t = e.touches[0];
          const dx = t.clientX - dragStart.x;
          const dy = t.clientY - dragStart.y;
          const next = clampPan(dragStart.tx + dx, dragStart.ty + dy, zoom);
          setTx(next.tx);
          setTy(next.ty);
        }}
      >
        <defs>
          <radialGradient id="bubble" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,197,94,0.65)" />
            <stop offset="100%" stopColor="rgba(14,165,233,0.35)" />
          </radialGradient>
        </defs>
        {Array.from({ length: 6 }, (_, i) => i + 1).map((t) => {
          const x = mapXScreen(t);
          return (
            <g key={`x-${t}`}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={height - padding.bottom}
                stroke="rgba(255,255,255,0.08)"
              />
              <text
                x={x}
                y={height - padding.bottom + 24}
                textAnchor="middle"
                className="fill-white text-xs"
              >
                CTS {t}
              </text>
            </g>
          );
        })}
        {[0, 10, 25, 50, 75, 90, 100].map((s) => {
          const y = mapYScreen(s);
          return (
            <g key={`y-${s}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-white text-[11px]"
              >
                {s}
              </text>
            </g>
          );
        })}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="rgba(255,255,255,0.12)"
        />
        <g transform={`translate(${tx} ${ty}) scale(${zoom})`}>
          {curvePath ? (
            <path
              d={curvePath}
              fill="none"
              stroke="rgba(0,255,180,0.5)"
              strokeWidth="clamp(0.6px, 0.3vw, 3px)"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {medianPath ? (
            <path
              d={medianPath}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="clamp(0.5px, 0.25vw, 2px)"
              strokeDasharray="6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {p90Path ? (
            <path
              d={p90Path}
              fill="none"
              stroke="rgba(255,200,0,0.5)"
              strokeWidth="clamp(0.5px, 0.25vw, 2px)"
              strokeDasharray="2 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {points.map((p, idx) => (
            <g
              key={`pt-${idx}`}
              onMouseEnter={() =>
                setHovered({
                  label: p.label,
                  sx: p.x * zoom + tx,
                  sy: (p.y - p.size - 10) * zoom + ty,
                })
              }
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() =>
                setHovered({
                  label: p.label,
                  sx: p.x * zoom + tx,
                  sy: (p.y - p.size - 10) * zoom + ty,
                })
              }
              onTouchEnd={() => setHovered(null)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={p.size}
                fill="url(#bubble)"
                stroke="rgba(0,255,200,0.35)"
                strokeWidth="clamp(0.75px, 0.35vw, 1.25px)"
                vectorEffect="non-scaling-stroke"
                opacity={0.9}
              />
            </g>
          ))}
          {tierStats.map((t, i) => (
            <g key={`line-handle-${i}`}>
              <circle
                cx={t.x}
                cy={t.yAvg}
                r={8 / zoom}
                fill="transparent"
                onMouseEnter={() =>
                  setHovered({
                    label: `Avg ${t.avgScore.toFixed(1)}`,
                    sx: t.x * zoom + tx,
                    sy: t.yAvg * zoom + ty - 18,
                  })
                }
                onMouseLeave={() => setHovered(null)}
              />
              <circle
                cx={t.x}
                cy={t.yMed}
                r={8 / zoom}
                fill="transparent"
                onMouseEnter={() =>
                  setHovered({
                    label: `Median ${t.median.toFixed(1)}`,
                    sx: t.x * zoom + tx,
                    sy: t.yMed * zoom + ty - 18,
                  })
                }
                onMouseLeave={() => setHovered(null)}
              />
              <circle
                cx={t.x}
                cy={t.yP90}
                r={8 / zoom}
                fill="transparent"
                onMouseEnter={() =>
                  setHovered({
                    label: `P90 ${t.p90.toFixed(1)}`,
                    sx: t.x * zoom + tx,
                    sy: t.yP90 * zoom + ty - 18,
                  })
                }
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          ))}
        </g>
        {hovered ? (() => {
          const minW = 140;
          const maxW = 320;
          const textW = hovered.label.length * 7;
          const w = Math.min(maxW, Math.max(minW, textW + 20));
          const h = 22;
          const x = Math.max(10, Math.min(hovered.sx - w / 2, width - w - 10));
          const y = Math.max(10, hovered.sy - h - 8);
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={8}
                ry={8}
                fill="rgba(0,0,0,0.75)"
                stroke="rgba(0,255,200,0.4)"
              />
              <text
                x={x + w / 2}
                y={y + h / 2 + 4}
                textAnchor="middle"
                className="fill-white text-[11px]"
              >
                {hovered.label}
              </text>
            </g>
          );
        })() : null}
        <g className="text-[11px] fill-white/70" transform={`translate(${padding.left} ${padding.top - 8})`}>
          <rect x={0} y={-16} width={340} height={20} fill="rgba(0,0,0,0.3)" rx={6} />
          <g transform="translate(10 0)" className="flex items-center gap-3">
            <line
              x1={0}
              y1={-6}
              x2={30}
              y2={-6}
              stroke="rgba(0,255,180,0.6)"
              strokeWidth="clamp(0.6px, 0.3vw, 3px)"
            />
            <text x={36} y={-2}>Avg</text>
            <line
              x1={70}
              y1={-6}
              x2={100}
              y2={-6}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="clamp(0.5px, 0.25vw, 2px)"
              strokeDasharray="6 6"
            />
            <text x={106} y={-2}>Median</text>
            <line
              x1={150}
              y1={-6}
              x2={180}
              y2={-6}
              stroke="rgba(255,200,0,0.6)"
              strokeWidth="clamp(0.5px, 0.25vw, 2px)"
              strokeDasharray="2 4"
            />
            <text x={186} y={-2}>P90</text>
            <circle cx={230} cy={-6} r={6} fill="url(#bubble)" stroke="rgba(0,255,200,0.35)" />
            <text x={242} y={-2}>Liquidity</text>
            <g className="cursor-pointer" onClick={() => setShowLegendInfo(true)}>
              <rect
                x={300}
                y={-12}
                width={30}
                height={16}
                rx={4}
                ry={4}
                fill="rgba(255,255,255,0.12)"
              />
              <text
                x={315}
                y={-1}
                textAnchor="middle"
                className="fill-white"
              >
                info
              </text>
            </g>
          </g>
        </g>
      </svg>
      {showLegendInfo ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="max-w-lg rounded-2xl border border-emerald-400/40 bg-[#0b1220] p-4 text-white shadow-[0_0_40px_rgba(0,0,0,0.45)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Legend details
              </div>
              <button
                onClick={() => setShowLegendInfo(false)}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <ul className="space-y-1 text-sm text-white/80">
              <li>
                <b className="text-cyan-300/80">Units</b>: Liquidity and volume values are displayed in <b>USD</b> (source feed),
                not on-chain AVAX. Scores and rankings are computed using relative ratios only.
              </li>
              <li><b className="text-teal-400/80">Avg</b>: liquidity-weighted average TRAXR score per tier (solid teal).</li>
              <li><b className="text-white/50">Median</b>: mid-point of pool scores per tier (white dashed).</li>
              <li><b className="text-amber-400/80">P90</b>: 90th percentile of scores per tier (amber dotted).</li>
              <li>Liquidity bubbles: size = pool liquidity; hover/tap to see pool.</li>
              <li>Pan/zoom to focus; axes update to reflect current view.</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function catmullRomToBezier(points: { x: number; y: number }[]) {
  const res: number[][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    res.push([i === 0 ? p1.x : c1x, i === 0 ? p1.y : c1y, c2x, c2y, p2.x, p2.y]);
  }
  return res;
}
