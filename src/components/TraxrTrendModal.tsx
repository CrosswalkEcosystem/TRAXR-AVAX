"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TraxrScoreResult, TraxrTrendPoint } from "@/lib/types";
import { IconType } from "react-icons";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiDroplet,
  FiHash,
  FiLayers,
  FiPercent,
  FiShield,
  FiTarget,
  FiThermometer,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";

type Props = {
  open: boolean;
  pool?: TraxrScoreResult | null;
  onClose: () => void;
};

type MetricKey =
  | "score"
  | "ctsNodes"
  | "depth"
  | "activity"
  | "impact"
  | "stability"
  | "trust"
  | "fee"
  | "liquidity"
  | "volume24h"
  | "feePct"
  | "concentration"
  | "volatilityImpact"
  | "warnings";

type MetricOption = {
  key: MetricKey;
  label: string;
  icon: IconType;
  strokeClass: string;
  dotClass: string;
  description: string;
  format: (value: number) => string;
};

const formatInt = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatPct = (value: number) => {
  if (value > 0 && value < 0.01) return "<0.01%";
  return `${value.toFixed(2)}%`;
};

const formatFeePct = (value: number) => {
  if (value > 0 && value < 0.01) return "<0.01%";
  return `${value.toFixed(2)}%`;
};

const metricOptions: MetricOption[] = [
  {
    key: "score",
    label: "TRAXR Score",
    icon: FiTrendingUp,
    strokeClass: "stroke-cyan-300",
    dotClass: "bg-cyan-300",
    description: "Overall TRAXR score (0-100).",
    format: (v) => v.toFixed(1),
  },
  {
    key: "ctsNodes",
    label: "CTS Nodes",
    icon: FiHash,
    strokeClass: "stroke-emerald-300",
    dotClass: "bg-emerald-300",
    description: "CTS node count derived from TRAXR score.",
    format: formatInt,
  },
  {
    key: "liquidity",
    label: "Liquidity (USD)",
    icon: FiDroplet,
    strokeClass: "stroke-amber-300",
    dotClass: "bg-amber-300",
    description: "Total pool liquidity in USD (source feed).",
    format: formatInt,
  },
  {
    key: "volume24h",
    label: "24h Volume (USD)",
    icon: FiActivity,
    strokeClass: "stroke-pink-300",
    dotClass: "bg-pink-300",
    description: "24h swap volume in USD (source feed).",
    format: formatInt,
  },
  {
    key: "feePct",
    label: "Fee %",
    icon: FiPercent,
    strokeClass: "stroke-indigo-300",
    dotClass: "bg-indigo-300",
    description: "AMM trading fee percentage (lower is cheaper).",
    format: formatFeePct,
  },
  {
    key: "concentration",
    label: "Concentration %",
    icon: FiLayers,
    strokeClass: "stroke-yellow-300",
    dotClass: "bg-yellow-300",
    description: "Liquidity concentration (best-effort).",
    format: formatPct,
  },
  {
    key: "volatilityImpact",
    label: "Volatility Impact %",
    icon: FiTarget,
    strokeClass: "stroke-fuchsia-300",
    dotClass: "bg-fuchsia-300",
    description: "Price impact proxy from 24h volume vs liquidity.",
    format: formatPct,
  },
  {
    key: "warnings",
    label: "Signals",
    icon: FiAlertTriangle,
    strokeClass: "stroke-red-300",
    dotClass: "bg-red-300",
    description: "Count of risk/info signals from CTS checks.",
    format: formatInt,
  },
  {
    key: "depth",
    label: "Depth",
    icon: FiLayers,
    strokeClass: "stroke-sky-300",
    dotClass: "bg-sky-300",
    description: "Liquidity depth normalization.",
    format: formatInt,
  },
  {
    key: "activity",
    label: "Activity",
    icon: FiZap,
    strokeClass: "stroke-blue-300",
    dotClass: "bg-blue-300",
    description: "Observed trading activity vs available depth.",
    format: formatInt,
  },
  {
    key: "impact",
    label: "Impact",
    icon: FiTarget,
    strokeClass: "stroke-fuchsia-200",
    dotClass: "bg-fuchsia-200",
    description: "Volatility impact proxy.",
    format: formatInt,
  },
  {
    key: "stability",
    label: "Stability",
    icon: FiThermometer,
    strokeClass: "stroke-teal-300",
    dotClass: "bg-teal-300",
    description: "Fee stability proxy.",
    format: formatInt,
  },
  {
    key: "trust",
    label: "Contract Risk",
    icon: FiShield,
    strokeClass: "stroke-lime-300",
    dotClass: "bg-lime-300",
    description: "Contract risk flags.",
    format: formatInt,
  },
  {
    key: "fee",
    label: "Dependencies",
    icon: FiBarChart2,
    strokeClass: "stroke-orange-300",
    dotClass: "bg-orange-300",
    description: "Protocol dependency flags.",
    format: formatInt,
  },
];

const defaultMetrics: MetricKey[] = [
  "score",
  "liquidity",
  "volume24h",
  "feePct",
];

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
  return tokB ? `${tokA}/${tokB}` : tokA || "Unknown";
}

function getMetricValue(point: TraxrTrendPoint, key: MetricKey) {
  const m = point.metrics;
  switch (key) {
    case "score":
      return point.score;
    case "ctsNodes":
      return point.ctsNodes;
    case "depth":
      return point.nodes.depth;
    case "activity":
      return point.nodes.activity;
    case "impact":
      return point.nodes.impact;
    case "stability":
      return point.nodes.stability;
    case "trust":
      return point.nodes.trust;
    case "fee":
      return point.nodes.fee;
    case "liquidity":
      return typeof m.liquidityUsd === "number" ? m.liquidityUsd : null;
    case "volume24h":
      return typeof m.volume24hUsd === "number" ? m.volume24hUsd : null;
    case "feePct":
      return typeof m.feePct === "number" ? m.feePct : null;
    case "concentration":
      return typeof m.liquidityConcentrationPct === "number"
        ? m.liquidityConcentrationPct
        : null;
    case "volatilityImpact":
      return typeof m.volatilityImpactPct === "number"
        ? m.volatilityImpactPct
        : null;
    case "warnings":
      return Array.isArray(point.warnings) ? point.warnings.length : null;
    default:
      return null;
  }
}

function formatSourceSummary(points: TraxrTrendPoint[]) {
  const counts = new Map<string, number>();
  for (const point of points) {
    const source = point.metrics?.dataSource || "unknown";
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ordered.length) return "n/a";
  return ordered.map(([name, count]) => `${name} ${count}`).join(" | ");
}

type SourceBand = {
  sourceKey: "avalanche-rpc" | "geckoterminal" | "other";
  startIdx: number;
  endIdx: number;
};

function sourceBandKey(point: TraxrTrendPoint): SourceBand["sourceKey"] {
  const source = String(point.metrics?.dataSource || "").toLowerCase();
  if (source === "avalanche-rpc") return "avalanche-rpc";
  if (source.includes("geckoterminal")) return "geckoterminal";
  return "other";
}

function buildSourceBands(points: TraxrTrendPoint[]): SourceBand[] {
  if (!points.length) return [];
  const bands: SourceBand[] = [];
  let currentKey = sourceBandKey(points[0]);
  let startIdx = 0;

  for (let i = 1; i < points.length; i += 1) {
    const key = sourceBandKey(points[i]);
    if (key === currentKey) continue;
    bands.push({ sourceKey: currentKey, startIdx, endIdx: i - 1 });
    currentKey = key;
    startIdx = i;
  }

  bands.push({
    sourceKey: currentKey,
    startIdx,
    endIdx: points.length - 1,
  });
  return bands;
}

function useSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    const rect = node.getBoundingClientRect();
    if (rect.width && rect.height) {
      setSize({ width: rect.width, height: rect.height });
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

export function TraxrTrendModal({ open, pool, onClose }: Props) {
  const [data, setData] = useState<TraxrTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(defaultMetrics);
  const [normalize, setNormalize] = useState(true);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [hintKey, setHintKey] = useState<MetricKey | null>(null);
  const { ref, size } = useSize();

  useEffect(() => {
    if (!open || !pool?.poolId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetch(`/api/traxr/pool-trend?poolId=${encodeURIComponent(pool.poolId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!isMounted) return;
        setData(Array.isArray(json) ? json : []);
      })
      .catch((e: any) => {
        if (!isMounted) return;
        setError(e?.message || "Failed to load trend data");
        setData([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [open, pool?.poolId]);

  useEffect(() => {
    if (!data.length) {
      setRange([0, 0]);
      return;
    }
    setRange([0, data.length - 1]);
  }, [data.length]);

  const total = data.length;
  const windowed = data.slice(range[0], range[1] + 1);
  const sourceSummary = useMemo(
    () => formatSourceSummary(windowed.length ? windowed : data),
    [windowed, data],
  );
  const activeSet = new Set(activeMetrics);
  const activeOptions = metricOptions.filter((m) => activeSet.has(m.key));

  const chartWidth = size.width || 640;
  const chartHeight = size.height || 280;

  const chartMeta = useMemo(() => {
    if (!windowed.length || !activeOptions.length) {
      return {
        normalized: new Map<MetricKey, Array<number | null>>(),
        seriesMax: new Map<MetricKey, number>(),
        seriesMin: new Map<MetricKey, number>(),
      };
    }

    const normalized = new Map<MetricKey, Array<number | null>>();
    const seriesMax = new Map<MetricKey, number>();
    const seriesMin = new Map<MetricKey, number>();

    for (const opt of activeOptions) {
      const values = windowed.map((point) => {
        const raw = getMetricValue(point, opt.key);
        return typeof raw === "number" && !Number.isNaN(raw) ? raw : null;
      });
      let base = 1;
      if (normalize) {
        const first = values.find((v) => typeof v === "number" && v !== 0);
        base = typeof first === "number" && first !== 0 ? first : 1;
      }
      const series = values.map((v) => {
        if (typeof v !== "number") return null;
        return normalize ? (v / base) * 100 : v;
      });
      normalized.set(opt.key, series);
      const numeric = series.filter((v): v is number => typeof v === "number");
      const maxVal = numeric.length > 0 ? Math.max(...numeric) : 1;
      const minVal = numeric.length > 0 ? Math.min(...numeric) : 0;
      seriesMax.set(opt.key, maxVal);
      seriesMin.set(opt.key, minVal);
    }

    return { normalized, seriesMax, seriesMin };
  }, [windowed, activeOptions, normalize]);

  const padding = { left: 36, right: 16, top: 16, bottom: 28 };
  const plotWidth = Math.max(0, chartWidth - padding.left - padding.right);
  const plotHeight = Math.max(0, chartHeight - padding.top - padding.bottom);
  const sourceBands = useMemo(() => buildSourceBands(windowed), [windowed]);

  const paths = useMemo(() => {
    const map = new Map<MetricKey, string>();
    if (!windowed.length || plotWidth <= 0 || plotHeight <= 0) return map;

    for (const [index, opt] of activeOptions.entries()) {
      const series = chartMeta.normalized.get(opt.key) || [];
      const maxVal = chartMeta.seriesMax.get(opt.key) ?? 1;
      const minVal = chartMeta.seriesMin.get(opt.key) ?? 0;
      const rangeVal = Math.max(1e-6, maxVal - minVal);
      const minSpan = normalize ? 4 : 0;
      const span = Math.max(rangeVal, minSpan);
      const pad = span * 0.12;
      const scaledMin = minVal - pad;
      const scaledMax = maxVal + pad;
      const scaledRange = Math.max(1e-6, scaledMax - scaledMin);
      const laneHeight =
        activeOptions.length > 0 ? plotHeight / activeOptions.length : plotHeight;
      const laneTop = padding.top + index * laneHeight;
      const lanePad = Math.max(6, laneHeight * 0.12);
      const usableHeight = Math.max(1, laneHeight - lanePad * 2);
      let path = "";
      series.forEach((value, idx) => {
        if (typeof value !== "number") return;
        const x =
          padding.left +
          (series.length === 1 ? 0 : (idx / (series.length - 1)) * plotWidth);
        const y =
          laneTop +
          lanePad +
          usableHeight -
          ((value - scaledMin) / scaledRange) * usableHeight;
        path += path ? ` L ${x} ${y}` : `M ${x} ${y}`;
      });
      map.set(opt.key, path);
    }
    return map;
  }, [activeOptions, chartMeta, plotHeight, plotWidth, windowed.length, normalize]);

  const hoverPoint =
    hoverIndex !== null && windowed[hoverIndex] ? windowed[hoverIndex] : null;
  const pinnedPoint =
    pinnedIndex !== null && windowed[pinnedIndex] ? windowed[pinnedIndex] : null;
  const activePoint = pinnedPoint || hoverPoint;
  const activeTimestamp = activePoint
    ? new Date(activePoint.timestamp).toLocaleString()
    : "";

  const latest = windowed[windowed.length - 1];
  const prev = windowed.length > 1 ? windowed[windowed.length - 2] : null;
  const hintMetric = hintKey
    ? metricOptions.find((metric) => metric.key === hintKey) ?? null
    : null;

  useEffect(() => {
    if (!hintKey) return;
    const timer = setTimeout(() => setHintKey(null), 2600);
    return () => clearTimeout(timer);
  }, [hintKey]);

  function toggleMetric(key: MetricKey) {
    setActiveMetrics((prev) => {
      if (prev.includes(key)) {
        return prev.filter((m) => m !== key);
      }
      return [...prev, key];
    });
  }

  function clampRange(nextStart: number, nextEnd: number) {
    if (total <= 1) return [0, 0] as [number, number];
    const start = Math.max(0, Math.min(nextStart, total - 2));
    const end = Math.max(start + 1, Math.min(nextEnd, total - 1));
    return [start, end] as [number, number];
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-3 py-6 backdrop-blur sm:items-center">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a101c] via-[#0f172a] to-[#0b1220] shadow-[0_0_50px_rgba(0,0,0,0.55)]">
        <style jsx>{`
          @keyframes traxr-draw {
            from {
              stroke-dashoffset: 1;
              opacity: 0.2;
            }
            to {
              stroke-dashoffset: 0;
              opacity: 1;
            }
          }
          @keyframes traxr-glow {
            0%,
            100% {
              opacity: 0.9;
              filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.18));
            }
            50% {
              opacity: 1;
              filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.35));
            }
          }
        `}</style>
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
                Pool Trend
              </div>
              <div className="text-sm text-white/60">
                {pool ? poolLabel(pool) : "Selected pool"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[85vh] overflow-y-auto px-5 pb-6 pt-4">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
              Loading trend data...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : total === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
              No snapshots yet. Add more `avaxPools_*.json` files to see trends.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {metricOptions.map((metric) => (
                    <button
                      key={metric.key}
                      type="button"
                      aria-label={metric.label}
                      title={metric.description}
                      onClick={() => {
                        toggleMetric(metric.key);
                        setHintKey(metric.key);
                      }}
                      className={`group inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${
                        activeSet.has(metric.key)
                          ? "border-cyan-300/60 bg-cyan-500/10 text-cyan-100 shadow-[0_0_14px_rgba(0,255,255,0.25)]"
                          : "border-white/15 bg-white/5 text-white/50 hover:text-white/80"
                      }`}
                    >
                      <metric.icon className="h-4 w-4" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNormalize((prev) => !prev)}
                    className={`ml-auto rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                      normalize
                        ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                        : "border-white/15 bg-white/5 text-white/50"
                    }`}
                  >
                    {normalize ? "Normalized" : "Raw scale"}
                  </button>
                </div>
                {hintMetric ? (
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70">
                    <span className="font-semibold text-white/90">{hintMetric.label}</span>
                    <span className="text-white/50"> - </span>
                    <span>{hintMetric.description}</span>
                  </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <div ref={ref} className="relative h-64 sm:h-72 lg:h-80">
                      <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="absolute inset-0"
                        style={{ touchAction: "none" }}
                        onMouseLeave={() => setHoverIndex(null)}
                        onMouseMove={(event) => {
                          if (!windowed.length) return;
                          const rect = (
                            event.currentTarget as SVGSVGElement
                          ).getBoundingClientRect();
                          const usableWidth = Math.max(
                            1,
                            rect.width - padding.left - padding.right,
                          );
                          const x = event.clientX - rect.left - padding.left;
                          const ratio = Math.max(0, Math.min(1, x / usableWidth));
                          const idx = Math.round(
                            ratio * Math.max(0, windowed.length - 1),
                          );
                          setHoverIndex(idx);
                        }}
                        onClick={(event) => {
                          if (!windowed.length) return;
                          const rect = (
                            event.currentTarget as SVGSVGElement
                          ).getBoundingClientRect();
                          const usableWidth = Math.max(
                            1,
                            rect.width - padding.left - padding.right,
                          );
                          const x = event.clientX - rect.left - padding.left;
                          const ratio = Math.max(0, Math.min(1, x / usableWidth));
                          const idx = Math.round(
                            ratio * Math.max(0, windowed.length - 1),
                          );
                          setPinnedIndex((prev) => (prev === idx ? null : idx));
                        }}
                        onTouchStart={(event) => {
                          if (!windowed.length) return;
                          event.preventDefault();
                          const touch = event.touches[0];
                          if (!touch) return;
                          const rect = (
                            event.currentTarget as SVGSVGElement
                          ).getBoundingClientRect();
                          const usableWidth = Math.max(
                            1,
                            rect.width - padding.left - padding.right,
                          );
                          const x = touch.clientX - rect.left - padding.left;
                          const ratio = Math.max(0, Math.min(1, x / usableWidth));
                          const idx = Math.round(
                            ratio * Math.max(0, windowed.length - 1),
                          );
                          setPinnedIndex((prev) => (prev === idx ? null : idx));
                        }}
                      >
                        <defs>
                          <linearGradient id="trendFade" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgba(0,255,255,0.18)" />
                            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                          </linearGradient>
                        </defs>
                        {sourceBands.map((band) => {
                          const totalPoints = windowed.length;
                          if (!totalPoints) return null;
                          const indexToX = (idx: number) =>
                            padding.left +
                            (totalPoints === 1
                              ? 0
                              : (idx / (totalPoints - 1)) * plotWidth);
                          const xStart = indexToX(band.startIdx);
                          const rightBound =
                            band.endIdx === totalPoints - 1
                              ? padding.left + plotWidth
                              : indexToX(band.endIdx + 1);
                          const width = Math.max(4, rightBound - xStart);
                          const fill =
                            band.sourceKey === "avalanche-rpc"
                              ? "rgba(34,197,94,0.12)"
                              : band.sourceKey === "geckoterminal"
                                ? "rgba(59,130,246,0.06)"
                                : "rgba(148,163,184,0.05)";
                          const stroke =
                            band.sourceKey === "avalanche-rpc"
                              ? "rgba(52,211,153,0.35)"
                              : band.sourceKey === "geckoterminal"
                                ? "rgba(96,165,250,0.2)"
                                : "rgba(148,163,184,0.12)";
                          return (
                            <rect
                              key={`source-band-${band.startIdx}-${band.endIdx}-${band.sourceKey}`}
                              x={xStart}
                              y={padding.top}
                              width={width}
                              height={plotHeight}
                              fill={fill}
                              stroke={stroke}
                              strokeWidth={0.8}
                            />
                          );
                        })}
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const y =
                            padding.top + (idx / 3) * plotHeight;
                          return (
                            <line
                              key={`grid-${idx}`}
                              x1={padding.left}
                              x2={padding.left + plotWidth}
                              y1={y}
                              y2={y}
                              stroke="rgba(255,255,255,0.08)"
                              strokeDasharray="4 6"
                            />
                          );
                        })}
                        {activeOptions.map((metric, idx) => {
                          const path = paths.get(metric.key);
                          if (!path) return null;
                          return (
                            <path
                              key={`${metric.key}-${normalize}-${range[0]}-${range[1]}`}
                              d={path}
                              className={`${metric.strokeClass} fill-none`}
                              strokeWidth={2.2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              pathLength={1}
                              strokeDasharray={1}
                              strokeDashoffset={1}
                              style={{
                                animation:
                                  "traxr-draw 0.9s ease forwards, traxr-glow 2.6s ease 1s infinite",
                                animationDelay: `${idx * 80}ms`,
                              }}
                            />
                          );
                        })}
                        {(pinnedPoint || (hoverIndex !== null && windowed[hoverIndex])) ? (
                          <line
                            x1={
                              padding.left +
                              (windowed.length === 1
                                ? 0
                                : ((pinnedIndex ?? hoverIndex ?? 0) /
                                    (windowed.length - 1)) *
                                  plotWidth)
                            }
                            x2={
                              padding.left +
                              (windowed.length === 1
                                ? 0
                                : ((pinnedIndex ?? hoverIndex ?? 0) /
                                    (windowed.length - 1)) *
                                  plotWidth)
                            }
                            y1={padding.top}
                            y2={padding.top + plotHeight}
                            stroke={
                              pinnedPoint ? "rgba(0,255,255,0.6)" : "rgba(255,255,255,0.25)"
                            }
                            strokeDasharray="3 6"
                          />
                        ) : null}
                      </svg>
                      {activePoint ? (
                        <div className="pointer-events-none absolute right-4 top-4 max-w-[220px] rounded-2xl border border-white/15 bg-black/80 p-3 text-xs text-white/80 shadow-[0_0_18px_rgba(0,0,0,0.45)]">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                            {activeTimestamp}
                          </div>
                          <div className="mt-2 space-y-1">
                            {activeOptions.map((metric) => {
                              const raw = getMetricValue(activePoint, metric.key);
                              const value =
                                typeof raw === "number"
                                  ? metric.format(raw)
                                  : "n/a";
                              return (
                                <div key={metric.key} className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${metric.dotClass}`} />
                                  <span className="text-white/70">{metric.label}</span>
                                  <span className="ml-auto text-white">{value}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs uppercase tracking-[0.22em] text-white/60">
                        Snapshots {total}
                      </div>
                      <div className="text-right text-xs text-white/60">
                        <div>
                          {windowed[0]
                            ? new Date(windowed[0].timestamp).toLocaleString()
                            : "n/a"}{" "}
                          -{" "}
                          {windowed[windowed.length - 1]
                            ? new Date(
                                windowed[windowed.length - 1].timestamp,
                              ).toLocaleString()
                            : "n/a"}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
                          Sources: {sourceSummary}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-3 text-[10px] uppercase tracking-[0.14em] text-white/40">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-blue-400/80" />
                            Gecko
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                            AVAX RPC
                          </span>
                        </div>
                      </div>
                    </div>

                    {total > 1 ? (
                      <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 sm:grid-cols-2">
                        <label className="space-y-2 text-xs text-white/60">
                          Start
                          <input
                            type="range"
                            min={0}
                            max={Math.max(0, total - 2)}
                            value={range[0]}
                            onChange={(e) => {
                              const nextStart = Number(e.target.value);
                              setRange((prev) =>
                                clampRange(nextStart, prev[1]),
                              );
                            }}
                            className="w-full"
                          />
                        </label>
                        <label className="space-y-2 text-xs text-white/60">
                          End
                          <input
                            type="range"
                            min={1}
                            max={Math.max(1, total - 1)}
                            value={range[1]}
                            onChange={(e) => {
                              const nextEnd = Number(e.target.value);
                              setRange((prev) =>
                                clampRange(prev[0], nextEnd),
                              );
                            }}
                            className="w-full"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/80 shadow-[0_0_20px_rgba(0,0,0,0.35)]">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/60">
                      Latest snapshot
                    </div>
                    {latest ? (
                      <div className="mt-3 space-y-2 text-sm">
                        {[
                          metricOptions.find((m) => m.key === "score"),
                          metricOptions.find((m) => m.key === "ctsNodes"),
                          metricOptions.find((m) => m.key === "liquidity"),
                          metricOptions.find((m) => m.key === "volume24h"),
                          metricOptions.find((m) => m.key === "feePct"),
                          metricOptions.find((m) => m.key === "concentration"),
                          metricOptions.find((m) => m.key === "volatilityImpact"),
                        ]
                          .filter(Boolean)
                          .map((metric) => {
                            const opt = metric as MetricOption;
                            const raw = getMetricValue(latest, opt.key);
                            const value =
                              typeof raw === "number"
                                ? opt.format(raw)
                                : "n/a";
                            const prevRaw =
                              prev && typeof getMetricValue(prev, opt.key) === "number"
                                ? (getMetricValue(prev, opt.key) as number)
                                : null;
                            const delta =
                              typeof raw === "number" && prevRaw !== null
                                ? raw - prevRaw
                                : null;
                            return (
                              <div
                                key={opt.key}
                                className="flex items-center gap-2 text-white/70"
                              >
                                <span className={`h-2 w-2 rounded-full ${opt.dotClass}`} />
                                <span>{opt.label}</span>
                                <span className="ml-auto text-white">{value}</span>
                                <span className="text-xs text-white/40">
                                  {delta === null
                                    ? ""
                                    : `(${delta >= 0 ? "+" : ""}${opt.format(delta)})`}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-white/50">No data</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
