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
  impact: { short: "Impact", title: "Volatility Impact" },
  stability: { short: "Stability", title: "Fee Stability" },
  trust: { short: "Trust", title: "Contract Risk" },
  fee: { short: "Dependencies", title: "Protocol Dependencies" },
};

export function TraxrConsole({ pool }: Props) {
  const nodes = pool.nodes;

  const [selected, setSelected] = useState<NodeKey[]>([]);
  const [output, setOutput] = useState("");
  const [typing, setTyping] = useState(false);

  /* ---------------------------------------------
   * Which metric buttons are allowed
   * --------------------------------------------- */
  const enabledNodes = useMemo(() => {
    if (selected.length === 0) return ALL_NODES;

    return ALL_NODES.filter((n) =>
      selected.every(
        (s) => s === n || VALID_COMBINATIONS[s]?.includes(n),
      ),
    );
  }, [selected]);

  /* ---------------------------------------------
   * Helper: suggestion hint
   * --------------------------------------------- */
  const suggestionHint = useMemo(() => {
    if (selected.length !== 1) return null;

    const base = selected[0];
    const next = VALID_COMBINATIONS[base];

    if (!next || next.length === 0) return null;

    return `Tip: Combine ${NODE_META[base].short} with ${next
      .map((n) => NODE_META[n].short)
      .join(" or ")} for deeper context.`;
  }, [selected]);

  /* ---------------------------------------------
   * Build explanation text
   * --------------------------------------------- */
  const explanationText = useMemo(() => {
    if (!nodes) {
      return "TRAXR-AVAX> No AVAX node data available for this pool.";
    }

    // Nothing selected
    if (selected.length === 0) {
      return (
        "TRAXR-AVAX> Awaiting metric selection\n\n" +
        "Select a metric above to understand how this pool behaves on AVAX.\n" +
        "Metrics describe structure and risk posture, not recommendations."
      );
    }

    // Single metric
    if (selected.length === 1) {
      const key = selected[0];
      const exp = getLocalExplanation(key, nodes[key]);

      return (
        `TRAXR-AVAX> Analyzing ${NODE_META[key].title}\n\n` +
        `${exp.title}\n\n` +
        `${exp.body}\n\n` +
        (suggestionHint ? `\n${suggestionHint}` : "")
      );
    }

    // Multi-metric
    const contextual = getContextualExplanationForSelection(
      selected,
      nodes,
    );

    if (contextual.length === 0) {
      return (
        `TRAXR-AVAX> Analyzing ${selected
          .map((s) => NODE_META[s].short)
          .join(" + ")}\n\n` +
        "Metrics are within neutral ranges.\n" +
        "No strong structural or behavioral signal detected.\n\n" +
        "Each metric remains meaningful when observed individually."
      );
    }

    return (
      `TRAXR-AVAX> Analyzing ${selected
        .map((s) => NODE_META[s].short)
        .join(" + ")}\n\n` +
      contextual
        .map((e) => `${e.title}\n\n${e.body}`)
        .join("\n\n---\n\n")
    );
  }, [selected, nodes, suggestionHint]);

  /* ---------------------------------------------
   * Typewriter effect (safe, no cut letters)
   * --------------------------------------------- */
  useEffect(() => {
    if (!explanationText) return;

    setTyping(true);
    setOutput("");

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setOutput(explanationText.slice(0, i));

      if (i >= explanationText.length) {
        clearInterval(interval);
        setTyping(false);
      }
    }, 14);

    return () => clearInterval(interval);
  }, [explanationText]);

  function toggleNode(node: NodeKey) {
    setSelected((prev) =>
      prev.includes(node)
        ? prev.filter((n) => n !== node)
        : [...prev, node],
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-blue/40 p-4 backdrop-blur shadow-[0_0_30px_rgba(0,255,200,0.08)]">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
          TRAXR Console
        </div>
        <div className="text-[10px] text-white/40">
          AVAX interpretation layer
        </div>
      </div>

      {/* Buttons */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ALL_NODES.map((node) => {
          const active = selected.includes(node);
          const enabled = enabledNodes.includes(node);

          return (
            <button
              key={node}
              disabled={!enabled}
              onClick={() => toggleNode(node)}
              className={`
                rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition
                ${
                  active
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-[0_0_12px_rgba(0,255,140,0.35)]"
                    : enabled
                    ? "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                    : "bg-white/3 text-white/20 border border-white/5 cursor-not-allowed"
                }
              `}
            >
              {NODE_META[node].short}
            </button>
          );
        })}
      </div>

      {/* Console output */}
      <div className="relative rounded-2xl bg-black/40 p-4 font-mono text-sm text-white/80 min-h-[140px]">
        <pre className="whitespace-pre-wrap leading-relaxed">
          {output}
          {typing && (
            <span className="inline-block w-[8px] animate-pulse text-emerald-400">
              |
            </span>
          )}
        </pre>
      </div>
    </div>
  );
}
