// Local alpha scorer for AVAX pools.
// Placeholder heuristics only; replace with real analytics when data is available.

import { AvaxPoolMetrics, TraxrNodeBreakdown } from "./types";

export type TraxrScoreResult = {
  score: number;
  nodes: TraxrNodeBreakdown;
  ctsNodes: number;
  metrics: AvaxPoolMetrics;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const scoreFromRange = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return 0;
  if (max === min) return 0;
  return clamp(((value - min) / (max - min)) * 100);
};

const inverseScoreFromRange = (value: number, min: number, max: number) =>
  clamp(100 - scoreFromRange(value, min, max));

const toCtsNodes = (score: number) => {
  if (score >= 85) return 6;
  if (score >= 70) return 5;
  if (score >= 55) return 4;
  if (score >= 40) return 3;
  if (score >= 25) return 2;
  return 1;
};

const toContractScore = (m: AvaxPoolMetrics) => {
  let score = 100;
  if (m.contractIsProxy) score -= 25;
  if (m.contractIsUpgradeable) score -= 25;
  if (m.contractAdmin || m.contractOwner) score -= 15;
  if (m.contractHasTimelock === false) score -= 10;
  if (m.contractIsProxy === null && m.contractIsUpgradeable === null) {
    score -= 15;
  }
  return clamp(score);
};

const toDependencyScore = (m: AvaxPoolMetrics) => {
  if (!m.protocolDependencies) return 60;
  if (m.protocolDependencies.length === 0) return 100;
  return clamp(100 - m.protocolDependencies.length * 20);
};

/**
 * Main adapter: compute score + attach raw AVAX metrics.
 */
export const toScoreResult = (m: AvaxPoolMetrics): TraxrScoreResult => {
  const depth = scoreFromRange(m.liquidityDepthUsd, 0, 12_000_000);
  const concentration =
    typeof m.liquidityConcentrationPct === "number"
      ? inverseScoreFromRange(m.liquidityConcentrationPct, 0, 100)
      : 50;
  const impact =
    typeof m.volatilityImpactPct === "number"
      ? inverseScoreFromRange(m.volatilityImpactPct, 0, 5)
      : 50;
  const stability =
    typeof m.feeStabilityPct === "number"
      ? clamp(m.feeStabilityPct)
      : 50;
  const trust = toContractScore(m);
  const fee = toDependencyScore(m);

  const nodes: TraxrNodeBreakdown = {
    depth,
    activity: concentration,
    impact,
    stability,
    trust,
    fee,
  };

  const score = clamp(
    (nodes.depth +
      nodes.activity +
      nodes.impact +
      nodes.stability +
      nodes.trust +
      nodes.fee) /
      6
  );

  return {
    score,
    nodes,
    ctsNodes: toCtsNodes(score),
    metrics: m,
  };
};

/**
 * Build warnings using placeholder heuristics.
 */
export const buildWarnings = (
  m: AvaxPoolMetrics,
  n: TraxrNodeBreakdown
): string[] => {
  const warnings: string[] = [];

  if (m.confidenceLevel === "low") {
    warnings.push("Low data confidence (alpha placeholder).");
  }
  if (!m.poolAddress) {
    warnings.push("Pool address unresolved (alpha placeholder).");
  }
  if (m.liquidityDepthUsd < 1_000_000) {
    warnings.push("Low liquidity depth (alpha heuristic).");
  }
  if ((m.liquidityConcentrationPct ?? 0) > 60) {
    warnings.push("Liquidity appears concentrated (alpha heuristic).");
  }
  if ((m.volatilityImpactPct ?? 0) > 2) {
    warnings.push("High volatility impact (alpha heuristic).");
  }
  if ((m.feeStabilityPct ?? 100) < 40) {
    warnings.push("Fee stability appears weak (alpha heuristic).");
  }
  if (m.contractIsProxy) {
    warnings.push("Proxy contract detected (alpha placeholder).");
  }
  if (m.contractIsUpgradeable) {
    warnings.push("Upgradeable contract detected (alpha placeholder).");
  }
  if (m.contractAdmin || m.contractOwner) {
    warnings.push("Admin/owner present (alpha placeholder).");
  }
  if ((m.protocolDependencies ?? []).length > 0) {
    warnings.push("Protocol dependency flags present (alpha placeholder).");
  }
  if (typeof m.dataAgeHours === "number" && m.dataAgeHours > 6) {
    warnings.push("Data is stale (>6h) (alpha placeholder).");
  }
  if (n.depth < 20 || n.activity < 20) {
    warnings.push("Low depth or concentrated liquidity (alpha heuristic).");
  }

  return warnings;
};
