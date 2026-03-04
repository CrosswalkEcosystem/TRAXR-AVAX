"use client";

import { useEffect, useMemo, useState } from "react";
import { TraxrScoreResult } from "@/lib/types";
import {
  getLocalExplanation,
  getContextualExplanationForSelection,
  VALID_COMBINATIONS,
} from "@/lib/nodeExplanations";

type Props = {
  pool: TraxrScoreResult;
};

type NodeKey = keyof TraxrScoreResult["nodes"];

const ALL_NODES: NodeKey[] = [
  "depth",
  "activity",
  "impact",
  "stability",
  "trust",
  "fee",
];

const NODE_META: Record<NodeKey, { short: string; title: string }> = {
  depth: { short: "Depth", title: "Liquidity Depth" },
  activity: { short: "Activity", title: "Trading Activity" },
  impact: { short: "Impact", title: "Execution Resilience" },
  stability: { short: "Stability", title: "Fee Stability" },
  trust: { short: "Trust", title: "Contract Risk" },
  fee: { short: "Dependencies", title: "Protocol Dependencies" },
};

function scoreBand(v: number): "LOW" | "MID" | "HIGH" {
  if (v >= 70) return "HIGH";
  if (v >= 40) return "MID";
  return "LOW";
}

function bandToneClass(band: "LOW" | "MID" | "HIGH") {
  if (band === "HIGH") return "border-emerald-300/40 bg-emerald-500/15 text-emerald-100";
  if (band === "MID") return "border-amber-300/40 bg-amber-500/15 text-amber-100";
  return "border-rose-300/40 bg-rose-500/15 text-rose-100";
}

function formatUsd(v: unknown) {
  if (typeof v !== "number") return "n/a";
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD`;
}

function formatFee(v: unknown) {
  if (typeof v !== "number") return "n/a";
  return `${v.toFixed(4)}%`;
}

export function TraxrConsole({ pool }: Props) {
  const nodes = pool.nodes;
  const [selected, setSelected] = useState<NodeKey[]>([]);
  const [streamText, setStreamText] = useState("");
  const [typing, setTyping] = useState(false);

  const enabledNodes = useMemo(() => {
    if (selected.length === 0) return ALL_NODES;
    return ALL_NODES.filter((n) =>
      selected.every((s) => s === n || VALID_COMBINATIONS[s]?.includes(n)),
    );
  }, [selected]);

  const rankedNodes = useMemo(
    () => [...ALL_NODES].sort((a, b) => nodes[b] - nodes[a]),
    [nodes],
  );
  const strongest = rankedNodes.slice(0, 2);
  const weakest = [...rankedNodes].reverse().slice(0, 2);

  const selectedInsights = useMemo(() => {
    if (!nodes || selected.length === 0) return [];
    if (selected.length === 1) {
      const key = selected[0];
      return [getLocalExplanation(key, nodes[key])];
    }
    return getContextualExplanationForSelection(selected, nodes);
  }, [nodes, selected]);

  const suggestionHint = useMemo(() => {
    if (selected.length !== 1) return null;
    const base = selected[0];
    const next = VALID_COMBINATIONS[base];
    if (!next?.length) return null;
    return next.slice(0, 3).map((n) => NODE_META[n].short).join(" | ");
  }, [selected]);

  const weakestProbes = useMemo(() => {
    const target = weakest[0];
    if (!target) return [];
    const links = VALID_COMBINATIONS[target] || [];
    return links.slice(0, 3).map((n) => `${NODE_META[target].short} + ${NODE_META[n].short}`);
  }, [weakest]);

  const streamSource = useMemo(() => {
    if (!selected.length) {
      return `TRAXR-AVAX> Ready. Strongest: ${NODE_META[strongest[0]].short}/${NODE_META[strongest[1]].short}. Watch: ${NODE_META[weakest[0]].short}/${NODE_META[weakest[1]].short}.`;
    }
    if (selected.length === 1) {
      const k = selected[0];
      return `TRAXR-AVAX> Probing ${NODE_META[k].title} (${nodes[k]}/100, ${scoreBand(nodes[k])}).`;
    }
    return `TRAXR-AVAX> Correlating ${selected
      .map((k) => NODE_META[k].short)
      .join(" + ")} across current pool state.`;
  }, [selected, strongest, weakest, nodes]);

  useEffect(() => {
    setStreamText("");
    setTyping(true);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setStreamText(streamSource.slice(0, i));
      if (i >= streamSource.length) {
        clearInterval(timer);
        setTyping(false);
      }
    }, 12);
    return () => clearInterval(timer);
  }, [streamSource]);

  function toggleNode(node: NodeKey) {
    setSelected((prev) =>
      prev.includes(node) ? prev.filter((n) => n !== node) : [...prev, node],
    );
  }

  const m: any = pool.metrics || {};

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#071327]/90 via-[#08172e]/80 to-[#061022]/90 p-4 backdrop-blur shadow-[0_0_30px_rgba(0,255,200,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
          TRAXR Console
        </div>
        <div className="text-[10px] text-white/45">
          Interpretability layer
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ALL_NODES.map((node) => {
          const active = selected.includes(node);
          const enabled = enabledNodes.includes(node);
          return (
            <button
              key={node}
              disabled={!enabled}
              onClick={() => toggleNode(node)}
              className={`min-w-[120px] flex-1 rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition sm:min-w-[150px] sm:flex-none ${
                active
                  ? "border border-emerald-300/40 bg-emerald-500/20 text-emerald-100 shadow-[0_0_12px_rgba(0,255,140,0.25)]"
                  : enabled
                  ? "border border-white/10 bg-white/5 text-white/75 hover:border-cyan-300/40 hover:bg-white/10"
                  : "cursor-not-allowed border border-white/5 bg-white/[0.03] text-white/20"
              }`}
            >
              {NODE_META[node].short}
            </button>
          );
        })}
      </div>

      <div className="mb-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-sm text-cyan-100/90">
        {streamText}
        {typing ? <span className="ml-0.5 inline-block animate-pulse text-emerald-300">|</span> : null}
      </div>

      {selected.length === 0 ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-cyan-300/20 bg-black/25 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">Pool Snapshot</div>
            <div className="mt-2 space-y-1 text-sm text-white/80">
              <div>Score: {pool.score} | CTS nodes: {pool.ctsNodes}</div>
              <div>Liquidity: {formatUsd(m.liquidityDepthUsd)}</div>
              <div>24h Volume: {formatUsd(m.volume24hUsd)}</div>
              <div>Fee: {formatFee(m.feePct)} | Signals: {(pool.warnings || []).length}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-black/25 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/75">Strengths</div>
            <div className="mt-2 space-y-2 text-sm text-white/80">
              {strongest.map((k) => (
                <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span>{NODE_META[k].title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${bandToneClass(scoreBand(nodes[k]))}`}>
                      {nodes[k]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-black/25 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-amber-200/75">Watchlist</div>
            <div className="mt-2 space-y-2 text-sm text-white/80">
              {weakest.map((k) => (
                <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span>{NODE_META[k].title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${bandToneClass(scoreBand(nodes[k]))}`}>
                      {nodes[k]}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-1 text-xs text-white/60">
                Suggested probes: {weakestProbes.length ? weakestProbes.join(" | ") : "Select nodes to inspect combinations."}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-3 lg:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">Data Provenance</div>
            <div className="mt-2 grid gap-2 text-sm text-white/75 sm:grid-cols-2 xl:grid-cols-6">
              <div className="xl:col-span-1">Source: {m.dataSource || "n/a"}</div>
              <div className="xl:col-span-1">DEX: {m.dex || "n/a"}</div>
              <div className="min-w-0 xl:col-span-3">
                <span className="mr-1">Pool:</span>
                <span className="break-all text-xs sm:text-sm">{m.poolAddress || "n/a"}</span>
              </div>
              <div className="xl:col-span-1">Updated: {m.poolUpdatedAt ? new Date(m.poolUpdatedAt).toLocaleString() : "n/a"}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-cyan-300/20 bg-black/25 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/75">Selected Metrics</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selected.map((k) => (
                <span
                  key={k}
                  className={`rounded-full border px-2.5 py-1 text-xs ${bandToneClass(scoreBand(nodes[k]))}`}
                >
                  {NODE_META[k].short}: {nodes[k]} [{scoreBand(nodes[k])}]
                </span>
              ))}
            </div>
            {suggestionHint ? (
              <div className="mt-2 text-xs text-white/60">
                Try next: {suggestionHint}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {selectedInsights.map((insight, idx) => (
              <div key={`${insight.title}-${idx}`} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/65">{insight.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-white/85">{insight.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
