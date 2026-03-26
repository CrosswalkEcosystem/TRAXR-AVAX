"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TraxrNodeBreakdown, TraxrScoreResult, TraxrTrendPoint } from "@/lib/types";
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
import { PoolSelect } from "./PoolSelect";

type Props = {
  open: boolean;
  pools: TraxrScoreResult[];
  initialLeftId?: string;
  onClose: () => void;
};

type Direction = "higher" | "lower" | "neutral";

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
  description: string;
};

const metricOptions: MetricOption[] = [
  { key: "score", label: "TRAXR Score", icon: FiTrendingUp, description: "Overall TRAXR score (0-100)." },
  { key: "ctsNodes", label: "CTS Nodes", icon: FiHash, description: "CTS node count derived from TRAXR score." },
  { key: "liquidity", label: "Liquidity (USD)", icon: FiDroplet, description: "Total pool liquidity in USD (source feed)." },
  { key: "volume24h", label: "24h Volume (USD)", icon: FiActivity, description: "24h swap volume in USD (source feed)." },
  { key: "feePct", label: "Fee %", icon: FiPercent, description: "AMM trading fee percentage (lower is cheaper)." },
  { key: "concentration", label: "Reserve Imbalance %", icon: FiActivity, description: "USD reserve imbalance from current pool composition." },
  { key: "volatilityImpact", label: "Volatility Impact %", icon: FiTarget, description: "Price impact proxy from 24h volume." },
  { key: "warnings", label: "Signals", icon: FiAlertTriangle, description: "Count of risk/info signals from CTS checks." },
  { key: "depth", label: "Depth", icon: FiLayers, description: "Liquidity depth normalization." },
  { key: "activity", label: "Activity", icon: FiZap, description: "Observed trading activity vs available depth." },
  { key: "impact", label: "Impact", icon: FiTarget, description: "Volatility impact proxy." },
  { key: "stability", label: "Stability", icon: FiThermometer, description: "Fee stability proxy." },
  { key: "trust", label: "Trust", icon: FiShield, description: "Contract risk flags." },
  { key: "fee", label: "Fee", icon: FiBarChart2, description: "Protocol dependency flags." },
];

const defaultMetrics: MetricKey[] = ["score"];

const nodeLabels: Record<keyof TraxrNodeBreakdown, string> = {
  depth: "Depth",
  activity: "Activity",
  impact: "Impact",
  stability: "Fee Stability",
  trust: "Contract Risk",
  fee: "Dependencies",
};

const nodeDescriptions: Record<keyof TraxrNodeBreakdown, string> = {
  depth: "Estimated depth available for swaps",
  activity: "Observed usage relative to available liquidity",
  impact: "Price sensitivity under trade pressure",
  stability: "Fee consistency over time",
  trust: "Proxy/upgradeability/admin controls",
  fee: "Protocol dependency flags",
};

const formatInt = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatPct = (value: number) => {
  if (value > 0 && value < 0.01) return "<0.01%";
  return `${value.toFixed(4)}%`;
};

const formatFeePct = (value: number) => {
  if (value > 0 && value < 0.01) return "<0.01%";
  return `${value.toFixed(4)}%`;
};

function formatMetricValue(key: MetricKey, value: number) {
  switch (key) {
    case "feePct":
      return formatFeePct(value);
    case "concentration":
    case "volatilityImpact":
      return formatPct(value);
    case "liquidity":
    case "volume24h":
      return formatInt(value);
    default:
      return formatInt(value);
  }
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
  if (!mint && !tokenName && !tokenSymbol) return "Token";
  if (mint === "SINGLE") return "";
  const base = tokenSymbol || tokenName || mint || "Token";
  const address = tokenAddress || mint;
  if (address && address.startsWith("0x") && address.length > 12) {
    const short = `${address.slice(0, 4)}...${address.slice(-4)}`;
    return `${base} (${short})`;
  }
  return base;
}

function formatDexChipLabel(dex?: string) {
  if (!dex) return "dex: unknown";
  let out = dex.replace(/[_\s]+/g, "-").toLowerCase();
  if (out.length > 28) out = `${out.slice(0, 27)}…`;
  return out;
}

function formatDexFullLabel(dex?: string) {
  if (!dex) return "unknown-dex";
  return dex.replace(/[_\s]+/g, "-").toLowerCase();
}

function formatDexShortLabel(dexFullLabel: string) {
  const map: Record<string, string> = {
    traderjoe: "TJ",
    "traderjoe-v2-1-avalanche": "TJ-v2.1-a",
    "traderjoe-v1-avalanche": "TJ-v1-a",
    pangolin: "PNG",
    "lydia-finance": "LYD",
    lydiafinance: "LYD",
    "lydia-finance-avalanche": "LYD-a",
    "sushiswap-avalanche": "SUSHI-a",
    "uniswap-v3-avalanche": "UNI-v3-a",
    "balancer-v2-avalanche": "BAL-v2-a",
  };
  if (map[dexFullLabel]) return map[dexFullLabel];
  const compact = dexFullLabel.replace(/[^a-z0-9-]/g, "");
  if (compact.length <= 10) return compact.toUpperCase();
  return `${compact.slice(0, 9)}...`.toUpperCase();
}

function pickOther(leftId: string | undefined, pools: TraxrScoreResult[], prefer?: string) {
  if (prefer && prefer !== leftId && pools.some((p) => p.poolId === prefer)) return prefer;
  return pools.find((p) => p.poolId !== leftId)?.poolId;
}

function metricWinner(left: number | null, right: number | null, direction: Direction) {
  if (left === null || right === null) return null;
  if (left === right || direction === "neutral") return null;
  if (direction === "lower") return left < right ? "left" : "right";
  return left > right ? "left" : "right";
}

function formatLoserVsWinner(direction: Direction, loserPct: number | null) {
  if (loserPct === null) return null;
  if (direction === "lower") {
    const multiple = loserPct / 100;
    return `${multiple.toFixed(2)}x higher than winner`;
  }
  return `${loserPct.toFixed(2)}% of winner`;
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

function sourceKeyFromTrendPoint(
  point: TraxrTrendPoint | undefined,
): SourceBand["sourceKey"] {
  const source = String(point?.metrics?.dataSource || "").toLowerCase();
  if (source === "avalanche-rpc") return "avalanche-rpc";
  if (source.includes("geckoterminal")) return "geckoterminal";
  return "other";
}

function resolveCompareSourceKey(
  left: TraxrTrendPoint | undefined,
  right: TraxrTrendPoint | undefined,
): SourceBand["sourceKey"] {
  const lk = sourceKeyFromTrendPoint(left);
  const rk = sourceKeyFromTrendPoint(right);
  if (lk === "avalanche-rpc" || rk === "avalanche-rpc") return "avalanche-rpc";
  if (lk === "geckoterminal" || rk === "geckoterminal") return "geckoterminal";
  return "other";
}

function buildSourceBands(
  timeline: string[],
  leftByTs: Map<string, TraxrTrendPoint>,
  rightByTs: Map<string, TraxrTrendPoint>,
): SourceBand[] {
  if (!timeline.length) return [];
  const bands: SourceBand[] = [];
  let current = resolveCompareSourceKey(
    leftByTs.get(timeline[0]),
    rightByTs.get(timeline[0]),
  );
  let startIdx = 0;

  for (let i = 1; i < timeline.length; i += 1) {
    const next = resolveCompareSourceKey(
      leftByTs.get(timeline[i]),
      rightByTs.get(timeline[i]),
    );
    if (next === current) continue;
    bands.push({ sourceKey: current, startIdx, endIdx: i - 1 });
    current = next;
    startIdx = i;
  }
  bands.push({ sourceKey: current, startIdx, endIdx: timeline.length - 1 });
  return bands;
}

function MetricRow({
  label,
  left,
  right,
  direction = "higher",
  format = formatInt,
  tooltip,
}: {
  label: string;
  left: number | null;
  right: number | null;
  direction?: Direction;
  format?: (value: number) => string;
  tooltip?: string;
}) {
  const [showTip, setShowTip] = useState(false);
  const winner = metricWinner(left, right, direction);
  const delta = left !== null && right !== null ? left - right : null;
  const deltaText = delta === null ? "n/a" : `${delta >= 0 ? "+" : ""}${format(delta)}`;

  const leftText = left === null ? "n/a" : format(left);
  const rightText = right === null ? "n/a" : format(right);

  let leftFill = 0;
  let rightFill = 0;
  let loserPct: number | null = null;
  if (left !== null && right !== null) {
    if (left === right) {
      leftFill = 100;
      rightFill = 100;
    } else if (direction === "lower") {
      const maxVal = Math.max(left, right);
      leftFill = maxVal > 0 ? (left / maxVal) * 100 : 0;
      rightFill = maxVal > 0 ? (right / maxVal) * 100 : 0;
      if (winner === "left") {
        loserPct = left > 0 ? (right / left) * 100 : null;
      } else if (winner === "right") {
        loserPct = right > 0 ? (left / right) * 100 : null;
      }
    } else {
      const winnerVal = Math.max(left, right);
      const loserVal = Math.min(left, right);
      if (winner === "left") {
        leftFill = 100;
        rightFill = winnerVal > 0 ? (loserVal / winnerVal) * 100 : 0;
        loserPct = winnerVal > 0 ? (loserVal / winnerVal) * 100 : null;
      } else {
        rightFill = 100;
        leftFill = winnerVal > 0 ? (loserVal / winnerVal) * 100 : 0;
        loserPct = winnerVal > 0 ? (loserVal / winnerVal) * 100 : null;
      }
    }
  }

  const leftClass =
    winner === "left"
      ? "border-cyan-300/70 text-cyan-100 ring-1 ring-cyan-300/60 shadow-[0_0_14px_rgba(0,255,255,0.25)]"
      : "border-cyan-400/30 text-cyan-100/80";
  const rightClass =
    winner === "right"
      ? "border-amber-300/70 text-amber-100 ring-1 ring-amber-300/60 shadow-[0_0_14px_rgba(255,200,80,0.25)]"
      : "border-amber-400/30 text-amber-100/80";

  const leftFillClass =
    winner === "left"
      ? "bg-gradient-to-r from-cyan-400/80 to-cyan-200/50"
      : "bg-gradient-to-r from-cyan-500/35 to-cyan-200/20";
  const rightFillClass =
    winner === "right"
      ? "bg-gradient-to-r from-amber-400/80 to-amber-200/50"
      : "bg-gradient-to-r from-amber-500/35 to-amber-200/20";
  const loserLabel = formatLoserVsWinner(direction, loserPct);

  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 grid-cols-[1fr_auto_1fr]">
      <div className={`relative overflow-hidden rounded-xl border px-3 py-2 text-sm font-semibold ${leftClass}`}>
        <div
          className={`absolute left-0 top-0 h-full ${leftFillClass}`}
          style={{ width: `${Math.max(0, Math.min(100, leftFill))}%` }}
        />
        <div className="relative z-10">{leftText}</div>
        {winner === "right" && loserLabel ? (
          <div className="relative z-10 mt-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
            {loserLabel}
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-center text-[11px] uppercase tracking-[0.14em] text-white/55">
        <span className="group relative inline-flex flex-col items-center gap-1 text-center">
          <span className="flex items-center justify-center gap-2 max-w-[130px] sm:max-w-none">
            <span className="leading-tight">{label}</span>
            {tooltip ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowTip((prev) => !prev);
                }}
                onBlur={() => setShowTip(false)}
                className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/5 text-[9px] font-semibold text-white/70"
                aria-label={`Explain ${label}`}
              >
                i
              </button>
            ) : null}
          </span>
          <span className="text-[10px] tracking-[0.16em] text-white/45">
            delta {deltaText}
          </span>
          {tooltip ? (
            <span
              className={`pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-48 -translate-x-1/2 rounded-md border border-white/10 bg-black/90 px-3 py-2 text-[11px] normal-case tracking-normal text-slate-200 shadow-lg transition-opacity ${
                showTip ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {tooltip}
            </span>
          ) : null}
        </span>
      </div>
      <div className={`relative overflow-hidden rounded-xl border px-3 py-2 text-sm font-semibold text-right ${rightClass}`}>
        <div
          className={`absolute left-0 top-0 h-full ${rightFillClass}`}
          style={{ width: `${Math.max(0, Math.min(100, rightFill))}%` }}
        />
        <div className="relative z-10">{rightText}</div>
        {winner === "left" && loserLabel ? (
          <div className="relative z-10 mt-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
            {loserLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NodeRow({
  label,
  description,
  left,
  right,
  leftName,
  rightName,
  nodeKey,
}: {
  label: string;
  description: string;
  left: number;
  right: number;
  leftName: string;
  rightName: string;
  nodeKey: keyof TraxrNodeBreakdown;
}) {
  const [activeTip, setActiveTip] = useState<"left" | "right" | null>(null);
  const [showStabilityTip, setShowStabilityTip] = useState(false);
  const leftPct = Math.max(0, Math.min(100, left));
  const rightPct = Math.max(0, Math.min(100, right));
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/60">{label}</div>
          <div className="flex items-center gap-2 text-xs text-white/45">
            <span>{description}</span>
            {nodeKey === "stability" ? (
              <>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Normalized
                </span>
                <span className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowStabilityTip((prev) => !prev);
                    }}
                    onBlur={() => setShowStabilityTip(false)}
                    className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/5 text-[9px] font-semibold text-white/70"
                    aria-label="Explain stability normalization"
                  >
                    i
                  </button>
                  <span
                    className={`pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-52 -translate-x-1/2 rounded-md border border-white/10 bg-black/90 px-3 py-2 text-[11px] normal-case tracking-normal text-slate-200 shadow-lg transition-opacity ${
                      showStabilityTip ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    Stability node is a normalized CTS interpretation, not the raw fee percentage.
                  </span>
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveTip((prev) => (prev === "left" ? null : "left"));
              }}
              onBlur={() => setActiveTip(null)}
              className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-cyan-100"
              aria-label={`Left pool: ${leftName}`}
            >
              L
            </button>
            <span
              className={`pointer-events-none absolute right-0 top-full z-10 mt-2 w-40 rounded-md border border-white/10 bg-black/90 px-3 py-2 text-[11px] normal-case tracking-normal text-slate-200 shadow-lg transition-opacity ${
                activeTip === "left" ? "opacity-100" : "opacity-0"
              }`}
            >
              {leftName}
            </span>
          </span>
          <span className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveTip((prev) => (prev === "right" ? null : "right"));
              }}
              onBlur={() => setActiveTip(null)}
              className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-amber-100"
              aria-label={`Right pool: ${rightName}`}
            >
              R
            </button>
            <span
              className={`pointer-events-none absolute right-0 top-full z-10 mt-2 w-40 rounded-md border border-white/10 bg-black/90 px-3 py-2 text-[11px] normal-case tracking-normal text-slate-200 shadow-lg transition-opacity ${
                activeTip === "right" ? "opacity-100" : "opacity-0"
              }`}
            >
              {rightName}
            </span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Left</span>
            <span>{leftPct}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-cyan-400/80 to-cyan-200/60"
              style={{ width: `${leftPct}%` }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Right</span>
            <span>{rightPct}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400/80 to-amber-200/60"
              style={{ width: `${rightPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TraxrCompareModal({ open, pools, initialLeftId, onClose }: Props) {
  const poolById = useMemo(
    () => new Map(pools.map((p) => [p.poolId, p])),
    [pools],
  );

  const [leftId, setLeftId] = useState<string | undefined>(
    initialLeftId ?? pools[0]?.poolId,
  );
  const [rightId, setRightId] = useState<string | undefined>(() =>
    pickOther(initialLeftId ?? pools[0]?.poolId, pools),
  );
  const [leftTrend, setLeftTrend] = useState<TraxrTrendPoint[]>([]);
  const [rightTrend, setRightTrend] = useState<TraxrTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(defaultMetrics);
  const [hintKey, setHintKey] = useState<MetricKey | null>(null);
  const [normalize, setNormalize] = useState(true);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const { ref, size } = useSize();

  useEffect(() => {
    if (!open) return;
    const nextLeft = initialLeftId ?? pools[0]?.poolId;
    setLeftId(nextLeft);
    setRightId((prev) => pickOther(nextLeft, pools, prev));
  }, [open, initialLeftId, pools]);

  useEffect(() => {
    if (!open || !leftId || !rightId) return;
    let isMounted = true;
    setTrendLoading(true);
    setTrendError(null);

    Promise.all([
      fetch(`/api/traxr/pool-trend?poolId=${encodeURIComponent(leftId)}`),
      fetch(`/api/traxr/pool-trend?poolId=${encodeURIComponent(rightId)}`),
    ])
      .then(async ([leftRes, rightRes]) => {
        if (!leftRes.ok) throw new Error(`Left HTTP ${leftRes.status}`);
        if (!rightRes.ok) throw new Error(`Right HTTP ${rightRes.status}`);
        const [leftJson, rightJson] = await Promise.all([
          leftRes.json(),
          rightRes.json(),
        ]);
        if (!isMounted) return;
        setLeftTrend(Array.isArray(leftJson) ? leftJson : []);
        setRightTrend(Array.isArray(rightJson) ? rightJson : []);
      })
      .catch((e: any) => {
        if (!isMounted) return;
        setTrendError(e?.message || "Failed to load trend data");
        setLeftTrend([]);
        setRightTrend([]);
      })
      .finally(() => {
        if (isMounted) setTrendLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, leftId, rightId]);

  useEffect(() => {
    const leftTimes = leftTrend.map((p) => p.timestamp);
    const rightTimes = rightTrend.map((p) => p.timestamp);
    const merged = Array.from(new Set([...leftTimes, ...rightTimes])).sort();
    if (!merged.length) {
      setRange([0, 0]);
      return;
    }
    setRange([0, merged.length - 1]);
  }, [leftTrend, rightTrend]);

  const left = leftId ? poolById.get(leftId) : undefined;
  const right = rightId ? poolById.get(rightId) : undefined;
  const hasChoices = pools.length > 1;

  const leftSnapshot: any = left?.metrics || left || {};
  const rightSnapshot: any = right?.metrics || right || {};

  const leftLiq = typeof leftSnapshot.liquidityUsd === "number" ? leftSnapshot.liquidityUsd : null;
  const rightLiq = typeof rightSnapshot.liquidityUsd === "number" ? rightSnapshot.liquidityUsd : null;

  const leftVol = typeof leftSnapshot.volume24hUsd === "number" ? leftSnapshot.volume24hUsd : null;
  const rightVol = typeof rightSnapshot.volume24hUsd === "number" ? rightSnapshot.volume24hUsd : null;

  const leftFee = typeof leftSnapshot.feePct === "number" ? leftSnapshot.feePct : null;
  const rightFee = typeof rightSnapshot.feePct === "number" ? rightSnapshot.feePct : null;

  const leftConcentration =
    typeof leftSnapshot.liquidityConcentrationPct === "number"
      ? leftSnapshot.liquidityConcentrationPct
      : null;
  const rightConcentration =
    typeof rightSnapshot.liquidityConcentrationPct === "number"
      ? rightSnapshot.liquidityConcentrationPct
      : null;
  const leftImpact =
    typeof leftSnapshot.volatilityImpactPct === "number"
      ? leftSnapshot.volatilityImpactPct
      : null;
  const rightImpact =
    typeof rightSnapshot.volatilityImpactPct === "number"
      ? rightSnapshot.volatilityImpactPct
      : null;

  const leftWarnings = left?.warnings?.length ?? null;
  const rightWarnings = right?.warnings?.length ?? null;

  const leftName = left ? poolLabel(left) : "Left pool";
  const rightName = right ? poolLabel(right) : "Right pool";
  const leftDexFull = formatDexFullLabel((left?.metrics as any)?.dex);
  const rightDexFull = formatDexFullLabel((right?.metrics as any)?.dex);
  const leftDex = formatDexShortLabel(leftDexFull);
  const rightDex = formatDexShortLabel(rightDexFull);
  const leftOptions = useMemo(
    () =>
      pools.map((p, idx) => ({
        value: p.poolId || `${idx}-${p.score}`,
        label: `${poolLabel(p)} | CTS ${p.ctsNodes}`,
        dexLabel: formatDexShortLabel(formatDexFullLabel((p.metrics as any)?.dex)),
        dexFullLabel: formatDexFullLabel((p.metrics as any)?.dex),
        disabled: p.poolId === rightId,
      })),
    [pools, rightId],
  );
  const rightOptions = useMemo(
    () =>
      pools.map((p, idx) => ({
        value: p.poolId || `${idx}-${p.score}`,
        label: `${poolLabel(p)} | CTS ${p.ctsNodes}`,
        dexLabel: formatDexShortLabel(formatDexFullLabel((p.metrics as any)?.dex)),
        dexFullLabel: formatDexFullLabel((p.metrics as any)?.dex),
        disabled: p.poolId === leftId,
      })),
    [pools, leftId],
  );

  const hintMetric = hintKey
    ? metricOptions.find((metric) => metric.key === hintKey) ?? null
    : null;

  useEffect(() => {
    if (!hintKey) return;
    const timer = setTimeout(() => setHintKey(null), 2600);
    return () => clearTimeout(timer);
  }, [hintKey]);

  const visibleMetrics = useMemo(() => {
    if (activeMetrics.length) return activeMetrics;
    return metricOptions[0] ? [metricOptions[0].key] : [];
  }, [activeMetrics]);
  const visibleOptions = metricOptions.filter((metric) =>
    visibleMetrics.includes(metric.key),
  );

  const fullTimeline = useMemo(() => {
    const leftTimes = leftTrend.map((p) => p.timestamp);
    const rightTimes = rightTrend.map((p) => p.timestamp);
    return Array.from(new Set([...leftTimes, ...rightTimes])).sort();
  }, [leftTrend, rightTrend]);

  const timeline = useMemo(
    () => fullTimeline.slice(range[0], range[1] + 1),
    [fullTimeline, range],
  );
  const leftSourceSummary = useMemo(
    () => formatSourceSummary(leftTrend),
    [leftTrend],
  );
  const rightSourceSummary = useMemo(
    () => formatSourceSummary(rightTrend),
    [rightTrend],
  );

  const leftByTs = useMemo(
    () => new Map(leftTrend.map((p) => [p.timestamp, p])),
    [leftTrend],
  );
  const rightByTs = useMemo(
    () => new Map(rightTrend.map((p) => [p.timestamp, p])),
    [rightTrend],
  );
  const sourceBands = useMemo(
    () => buildSourceBands(timeline, leftByTs, rightByTs),
    [timeline, leftByTs, rightByTs],
  );

  const chartWidth = size.width || 640;
  const chartHeight = size.height || 320;
  const padding = { left: 36, right: 16, top: 16, bottom: 28 };
  const plotWidth = Math.max(0, chartWidth - padding.left - padding.right);
  const plotHeight = Math.max(0, chartHeight - padding.top - padding.bottom);

  const chartMeta = useMemo(() => {
    const normalized = new Map<
      MetricKey,
      { left: Array<number | null>; right: Array<number | null> }
    >();
    const bounds = new Map<MetricKey, { min: number; max: number }>();

    for (const metric of visibleOptions) {
      const leftSeries = timeline.map((ts) => {
        const point = leftByTs.get(ts);
        if (!point) return null;
        const value = getMetricValue(point, metric.key);
        return typeof value === "number" ? value : null;
      });
      const rightSeries = timeline.map((ts) => {
        const point = rightByTs.get(ts);
        if (!point) return null;
        const value = getMetricValue(point, metric.key);
        return typeof value === "number" ? value : null;
      });

      const applyNormalize = (series: Array<number | null>) => {
        if (!normalize) return series;
        const base = series.find((v) => typeof v === "number" && v !== 0) ?? 1;
        return series.map((v) =>
          typeof v === "number" ? (v / base) * 100 : null,
        );
      };

      const leftNorm = applyNormalize(leftSeries);
      const rightNorm = applyNormalize(rightSeries);
      normalized.set(metric.key, { left: leftNorm, right: rightNorm });

      const activeVals = [...leftNorm, ...rightNorm].filter(
        (v): v is number => typeof v === "number",
      );

      const min = activeVals.length ? Math.min(...activeVals) : 0;
      const max = activeVals.length ? Math.max(...activeVals) : 1;
      const range = Math.max(1e-6, max - min);
      const avg = (Math.abs(min) + Math.abs(max)) / 2 || 1;
      const minSpan = normalize ? 1 : Math.max(avg * 0.005, 1e-6);
      const span = Math.max(range, minSpan);
      const pad = span * (normalize ? 0.06 : 0.04);

      if (normalize) {
        const mid = (min + max) / 2;
        bounds.set(metric.key, {
          min: mid - span / 2 - pad,
          max: mid + span / 2 + pad,
        });
      } else {
        const rawMin = min >= 0 ? 0 : min;
        const rawMax = max;
        const rawRange = Math.max(1e-6, rawMax - rawMin);
        const paddedMin = rawMin >= 0 ? rawMin : rawMin - pad;
        const paddedMax = rawMax + pad;
        const finalMin = paddedMin;
        const finalMax =
          rawRange < minSpan ? rawMin + minSpan + pad : paddedMax;
        bounds.set(metric.key, { min: finalMin, max: finalMax });
      }
    }

    return { normalized, bounds };
  }, [timeline, leftByTs, rightByTs, visibleOptions, normalize]);

  const paths = useMemo(() => {
    const map = new Map<MetricKey, { left: string; right: string }>();
    if (!timeline.length || plotWidth <= 0 || plotHeight <= 0) return map;

    const lanes = visibleOptions.length;
    const laneHeight = lanes > 0 ? plotHeight / lanes : plotHeight;

    for (const [index, metric] of visibleOptions.entries()) {
      const series = chartMeta.normalized.get(metric.key);
      if (!series) continue;
      const bounds = chartMeta.bounds.get(metric.key) || { min: 0, max: 1 };
      const range = Math.max(1e-6, bounds.max - bounds.min);
      const laneTop = padding.top + index * laneHeight;
      const lanePad = Math.max(6, laneHeight * 0.12);
      const usableHeight = Math.max(1, laneHeight - lanePad * 2);

      const poolOffset = normalize ? Math.min(10, laneHeight * 0.14) : 0;
      const buildPath = (values: Array<number | null>, offset: number) => {
        let path = "";
        values.forEach((value, idx) => {
          if (typeof value !== "number") return;
          const x =
            padding.left +
            (values.length === 1 ? 0 : (idx / (values.length - 1)) * plotWidth);
          const y =
            laneTop +
            lanePad +
            usableHeight -
            ((value - bounds.min) / range) * usableHeight +
            offset;
          path += path ? ` L ${x} ${y}` : `M ${x} ${y}`;
        });
        return path;
      };

      map.set(metric.key, {
        left: buildPath(series.left, -poolOffset),
        right: buildPath(series.right, poolOffset),
      });
    }

    return map;
  }, [timeline, plotHeight, plotWidth, chartMeta]);

  const hoverPoint = hoverIndex !== null ? timeline[hoverIndex] : null;
  const activePoint = pinnedIndex !== null ? timeline[pinnedIndex] : hoverPoint;
  const hoverLeft = activePoint ? leftByTs.get(activePoint) : null;
  const hoverRight = activePoint ? rightByTs.get(activePoint) : null;
  const activeMetric = visibleOptions[0]?.key;
  const activeBounds =
    (activeMetric && chartMeta.bounds.get(activeMetric)) || { min: 0, max: 1 };
  const xStartLabel = timeline[0]
    ? new Date(timeline[0]).toLocaleString()
    : "";
  const xEndLabel = timeline[timeline.length - 1]
    ? new Date(timeline[timeline.length - 1]).toLocaleString()
    : "";

  function toggleMetric(key: MetricKey) {
    setActiveMetrics((prev) => (prev[0] === key ? prev : [key]));
    setHintKey(key);
  }

  function clampRange(nextStart: number, nextEnd: number) {
    if (fullTimeline.length <= 1) return [0, 0] as [number, number];
    const start = Math.max(0, Math.min(nextStart, fullTimeline.length - 2));
    const end = Math.max(start + 1, Math.min(nextEnd, fullTimeline.length - 1));
    return [start, end] as [number, number];
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-3 py-6 backdrop-blur sm:items-center">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a101c] via-[#0f172a] to-[#0b1220] shadow-[0_0_40px_rgba(0,0,0,0.55)]">
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
        `}</style>
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Pool Compare</div>
              <div className="text-sm text-white/60">Side-by-side TRAXR snapshot</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-5 pb-6 pt-4">
          {!hasChoices ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
              Add another pool to compare.
            </div>
          ) : (
            <>
            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 grid-cols-[1fr_auto_1fr]">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">Left pool</div>
                  <span
                    className="max-w-[110px] rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-100 truncate"
                    title={leftDexFull}
                  >
                    {leftDex}
                  </span>
                </div>
                <PoolSelect
                  value={leftId || ""}
                  options={leftOptions}
                  onChange={(next) => {
                    setLeftId(next);
                    setRightId((prev) => pickOther(next, pools, prev));
                  }}
                  placeholder="Select left pool"
                />
              </div>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!leftId || !rightId) return;
                    setLeftId(rightId);
                    setRightId(leftId);
                  }}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 hover:border-white/40 hover:text-white"
                >
                  Swap
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">Right pool</div>
                  <span
                    className="max-w-[110px] rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-100 truncate"
                    title={rightDexFull}
                  >
                    {rightDex}
                  </span>
                </div>
                <PoolSelect
                  value={rightId || ""}
                  options={rightOptions}
                  onChange={(next) => {
                    setRightId(next);
                    if (next === leftId) {
                      setLeftId(pickOther(next, pools, leftId));
                    }
                  }}
                  placeholder="Select right pool"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-2xl border border-cyan-400/30 bg-black/30 p-4 shadow-[0_0_20px_rgba(0,255,255,0.12)]">
                <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">Left</div>
                <div className="mt-1 truncate text-sm sm:text-lg font-semibold text-white">{leftName}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-2 py-2 shadow-[0_0_14px_rgba(0,255,255,0.18)]">
                    <img
                      src={`/images/cts${Math.max(1, Math.min(6, left?.ctsNodes ?? 1))}.png`}
                      alt={`CTS ${left?.ctsNodes ?? 1}`}
                      className="h-10 w-10 object-contain"
                    />
                  </div>
                  <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-2 text-center">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">Score</div>
                    <div className="text-lg sm:text-2xl font-semibold text-cyan-100">{left?.score ?? "n/a"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-2.5 py-2 text-center">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">CTS</div>
                    <div className="text-lg sm:text-2xl font-semibold text-white">{left?.ctsNodes ?? "n/a"}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-white/50">
                  Updated {left?.updatedAt ? new Date(left.updatedAt).toLocaleString() : "n/a"}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                  VS
                </div>
              </div>
              <div className="rounded-2xl border border-amber-400/30 bg-black/30 p-4 shadow-[0_0_20px_rgba(255,200,80,0.12)]">
                <div className="text-xs uppercase tracking-[0.22em] text-amber-200/70">Right</div>
                <div className="mt-1 truncate text-sm sm:text-lg font-semibold text-white">{rightName}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-2 py-2 shadow-[0_0_14px_rgba(255,200,80,0.2)]">
                    <img
                      src={`/images/cts${Math.max(1, Math.min(6, right?.ctsNodes ?? 1))}.png`}
                      alt={`CTS ${right?.ctsNodes ?? 1}`}
                      className="h-10 w-10 object-contain"
                    />
                  </div>
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-2.5 py-2 text-center">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">Score</div>
                    <div className="text-lg sm:text-2xl font-semibold text-amber-100">{right?.score ?? "n/a"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-2.5 py-2 text-center">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">CTS</div>
                    <div className="text-lg sm:text-2xl font-semibold text-white">{right?.ctsNodes ?? "n/a"}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-white/50">
                  Updated {right?.updatedAt ? new Date(right.updatedAt).toLocaleString() : "n/a"}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <MetricRow
                label="Liquidity (USD)"
                left={leftLiq}
                right={rightLiq}
                tooltip="Total pool liquidity in USD (source feed)."
              />
              <MetricRow
                label="24h Volume (USD)"
                left={leftVol}
                right={rightVol}
                tooltip="Total swap volume in the last 24 hours, USD."
              />
              <MetricRow
                label="Fee %"
                left={leftFee}
                right={rightFee}
                direction="lower"
                format={formatFeePct}
                tooltip="AMM trading fee percentage (lower is cheaper)."
              />
              <MetricRow
                label="Reserve Imbalance %"
                left={leftConcentration}
                right={rightConcentration}
                direction="lower"
                format={formatPct}
                tooltip="USD reserve imbalance across pool sides (lower is better)."
              />
              <MetricRow
                label="Volatility Impact %"
                left={leftImpact}
                right={rightImpact}
                direction="lower"
                format={formatPct}
                tooltip="Price impact proxy derived from 24h volume vs liquidity."
              />
              <MetricRow
                label="Signals"
                left={leftWarnings}
                right={rightWarnings}
                direction="lower"
                tooltip="Count of risk and informational signals from CTS checks."
              />
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.26em] text-white/60">
                <span>TRAXR Nodes</span>
                <span>0 - 100</span>
              </div>
              <div className="grid gap-3">
                    {Object.entries(nodeLabels).map(([key, label]) => {
                      const leftVal = left?.nodes?.[key as keyof TraxrNodeBreakdown] ?? 0;
                      const rightVal = right?.nodes?.[key as keyof TraxrNodeBreakdown] ?? 0;
                      return (
                        <NodeRow
                          key={key}
                          label={label}
                          description={nodeDescriptions[key as keyof TraxrNodeBreakdown]}
                          left={leftVal}
                          right={rightVal}
                          leftName={leftName}
                          rightName={rightName}
                          nodeKey={key as keyof TraxrNodeBreakdown}
                        />
                      );
                    })}
              </div>
            </div>
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-white/60">
                <div>Trend comparison</div>
                <button
                  type="button"
                  onClick={() => setNormalize((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                    normalize
                      ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                      : "border-white/15 bg-white/5 text-white/50"
                  }`}
                >
                  {normalize ? "Normalized" : "Raw scale"}
                </button>
              </div>

              {trendLoading ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                  Loading trend data...
                </div>
              ) : trendError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                  {trendError}
                </div>
              ) : !timeline.length ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                  No trend data available.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/50">
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-cyan-100">
                        {leftName}
                      </span>
                      <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-amber-100">
                        {rightName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {metricOptions.map((metric) => (
                        <button
                          key={`metric-${metric.key}`}
                          type="button"
                          aria-label={metric.label}
                          title={metric.description}
                          onClick={() => toggleMetric(metric.key)}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${
                            visibleMetrics.includes(metric.key)
                              ? "border-cyan-300/60 bg-cyan-500/10 text-cyan-100 shadow-[0_0_14px_rgba(0,255,255,0.25)]"
                              : "border-white/15 bg-white/5 text-white/40 hover:text-white/80"
                          }`}
                        >
                          <metric.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                    {hintMetric ? (
                      <div className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70">
                        <span className="font-semibold text-white/90">{hintMetric.label}</span>
                        <span className="text-white/50"> - </span>
                        <span>{hintMetric.description}</span>
                      </div>
                    ) : null}

                    <div ref={ref} className="relative h-72 sm:h-80">
                      <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="absolute inset-0"
                        style={{ touchAction: "none" }}
                        onMouseLeave={() => setHoverIndex(null)}
                        onMouseMove={(event) => {
                          if (!timeline.length) return;
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
                            ratio * Math.max(0, timeline.length - 1),
                          );
                          setHoverIndex(idx);
                        }}
                        onClick={(event) => {
                          if (!timeline.length) return;
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
                            ratio * Math.max(0, timeline.length - 1),
                          );
                          setPinnedIndex((prev) => (prev === idx ? null : idx));
                        }}
                        onTouchStart={(event) => {
                          if (!timeline.length) return;
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
                            ratio * Math.max(0, timeline.length - 1),
                          );
                          setPinnedIndex((prev) => (prev === idx ? null : idx));
                        }}
                      >
                        {sourceBands.map((band) => {
                          const totalPoints = timeline.length;
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
                              key={`compare-source-band-${band.startIdx}-${band.endIdx}-${band.sourceKey}`}
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
                          const y = padding.top + (idx / 3) * plotHeight;
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
                        {activeMetric
                          ? [0, 0.5, 1].map((t, idx) => {
                              const y =
                                padding.top + (1 - t) * plotHeight;
                              const value =
                                activeBounds.min +
                                t * (activeBounds.max - activeBounds.min);
                              return (
                                <text
                                  key={`ytick-${idx}`}
                                  x={padding.left - 8}
                                  y={y + 4}
                                  textAnchor="end"
                                  fontSize="10"
                                  fill="rgba(255,255,255,0.45)"
                                >
                                  {value.toLocaleString("en-US", {
                                    maximumFractionDigits: 4,
                                  })}
                                </text>
                              );
                            })
                          : null}
                        {visibleOptions.map((metric, idx) => {
                          const series = paths.get(metric.key);
                          if (!series) return null;
                          const leftPath = series.left;
                          const rightPath = series.right;
                          return (
                            <g key={metric.key}>
                              {leftPath ? (
                                <path
                                  d={leftPath}
                                  className="stroke-cyan-300 fill-none"
                                  strokeWidth={2.1}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  pathLength={1}
                                  strokeDasharray={1}
                                  strokeDashoffset={1}
                                  style={{
                                    animation: "traxr-draw 0.9s ease forwards",
                                    animationDelay: `${idx * 70}ms`,
                                  }}
                                />
                              ) : null}
                              {rightPath ? (
                                <path
                                  d={rightPath}
                                  className="stroke-amber-300 fill-none"
                                  strokeWidth={2.1}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  pathLength={1}
                                  strokeDasharray={1}
                                  strokeDashoffset={1}
                                  style={{
                                    animation: "traxr-draw 0.9s ease forwards",
                                    animationDelay: `${idx * 70 + 160}ms`,
                                  }}
                                />
                              ) : null}
                            </g>
                          );
                        })}
                        {(pinnedIndex !== null || hoverIndex !== null) && timeline.length ? (
                          <line
                            x1={
                              padding.left +
                              (timeline.length === 1
                                ? 0
                                : ((pinnedIndex ?? hoverIndex ?? 0) /
                                    (timeline.length - 1)) *
                                  plotWidth)
                            }
                            x2={
                              padding.left +
                              (timeline.length === 1
                                ? 0
                                : ((pinnedIndex ?? hoverIndex ?? 0) /
                                    (timeline.length - 1)) *
                                  plotWidth)
                            }
                            y1={padding.top}
                            y2={padding.top + plotHeight}
                            stroke={
                              pinnedIndex !== null
                                ? "rgba(0,255,255,0.6)"
                                : "rgba(255,255,255,0.25)"
                            }
                            strokeDasharray="3 6"
                          />
                        ) : null}
                        {xStartLabel ? (
                          <text
                            x={padding.left}
                            y={padding.top + plotHeight + 18}
                            textAnchor="start"
                            fontSize="10"
                            fill="rgba(255,255,255,0.45)"
                          >
                            {xStartLabel}
                          </text>
                        ) : null}
                        {xEndLabel ? (
                          <text
                            x={padding.left + plotWidth}
                            y={padding.top + plotHeight + 18}
                            textAnchor="end"
                            fontSize="10"
                            fill="rgba(255,255,255,0.45)"
                          >
                            {xEndLabel}
                          </text>
                        ) : null}
                      </svg>
                      {activePoint ? (
                        <div className="pointer-events-none absolute right-4 top-4 max-w-[240px] rounded-2xl border border-white/15 bg-black/80 p-3 text-xs text-white/80 shadow-[0_0_18px_rgba(0,0,0,0.45)]">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                            {new Date(activePoint).toLocaleString()}
                          </div>
                          <div className="mt-2 space-y-1">
                            {visibleOptions.map((metric) => {
                              const leftVal =
                                hoverLeft
                                  ? getMetricValue(hoverLeft, metric.key)
                                  : null;
                              const rightVal =
                                hoverRight
                                  ? getMetricValue(hoverRight, metric.key)
                                  : null;
                              if (leftVal === null && rightVal === null) return null;
                              return (
                                <div key={metric.key} className="flex items-center gap-2">
                                  <span className="text-white/60">{metric.label}</span>
                                  {leftVal !== null ? (
                                  <span className="ml-auto text-cyan-200">
                                      {typeof leftVal === "number"
                                        ? formatMetricValue(metric.key, leftVal)
                                        : "n/a"}
                                    </span>
                                  ) : null}
                                  {rightVal !== null ? (
                                    <span className="text-amber-200">
                                      {typeof rightVal === "number"
                                        ? formatMetricValue(metric.key, rightVal)
                                        : "n/a"}
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {fullTimeline.length > 1 ? (
                      <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 sm:grid-cols-2">
                        <label className="space-y-2 text-xs text-white/60">
                          Start
                          <input
                            type="range"
                            min={0}
                            max={Math.max(0, fullTimeline.length - 2)}
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
                            max={Math.max(1, fullTimeline.length - 1)}
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

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/80">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/60">
                      Snapshot window
                    </div>
                    <div className="mt-2 text-sm text-white/70">
                      {timeline[0]
                        ? new Date(timeline[0]).toLocaleString()
                        : "n/a"}{" "}
                      -{" "}
                      {timeline[timeline.length - 1]
                        ? new Date(timeline[timeline.length - 1]).toLocaleString()
                        : "n/a"}
                    </div>
                    <div className="mt-3 text-xs text-white/50">
                      {timeline.length} snapshots
                    </div>
                    <div className="mt-4 space-y-2 text-xs text-white/50">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-300" />
                        <span>{leftName}</span>
                      </div>
                      <div className="pl-4 text-[10px] uppercase tracking-[0.14em] text-white/45">
                        {leftSourceSummary}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-300" />
                        <span>{rightName}</span>
                      </div>
                      <div className="pl-4 text-[10px] uppercase tracking-[0.14em] text-white/45">
                        {rightSourceSummary}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </div>
    </div>
  );
}

