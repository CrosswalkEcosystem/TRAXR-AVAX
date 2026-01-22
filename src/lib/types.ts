// TRAXR node breakdown aligns with CTS dimensions; used by scoring and UI.
export type TraxrNodeBreakdown = {
  depth: number;
  activity: number;
  impact: number;
  stability: number;
  trust: number;
  fee: number;
};

// Core normalized metrics for AVAX pool + contract scoring (alpha)
export type AvaxPoolMetrics = {
  // ----------------------------------
  // Pool identity
  // ----------------------------------
  poolId: string;
  poolRef?: string;
  mintA: string;
  mintB: string;

  // Pool contract identity (C-Chain)
  poolAddress?: string;
  addressSource?: string | null;
  entityType?: string | null;
  chain?: string | null;
  dataSource?: string | null;
  confidenceLevel?: "low" | "medium" | "high" | string | null;

  // ----------------------------------
  // Token metadata (ERC-20 style)
  // ----------------------------------
  tokenAName?: string;
  tokenASymbol?: string;
  tokenBName?: string;
  tokenBSymbol?: string;

  // Optional token contract addresses (if mintA/mintB are symbols)
  tokenAAddress?: string;
  tokenBAddress?: string;

  // DEX identifier (alpha, optional)
  dex?: string;

  // Last refresh timestamp for pool data (from source feed)
  poolUpdatedAt?: string;

  // ----------------------------------
  // UI + scorer legacy fields
  // (kept for backward compatibility)
  // ----------------------------------
  liquidityUsd: number;
  volume24hUsd: number;
  volume7dUsd: number | null;

  // Activity
  tx24h: number;
  tx7d: number | null;

  // Risk & behavior
  feePct: number | null;
  volatilityPct: number | null;

  // Optional analytics (alpha placeholders)
  priceImpactPct?: number | null;
  dataAgeHours?: number;

  // ----------------------------------
  // AVAX-specific pool + contract inputs
  // ----------------------------------
  liquidityDepthUsd: number;
  liquidityConcentrationPct: number | null;
  feeStabilityPct: number | null;
  volatilityImpactPct: number | null;

  contractIsProxy: boolean | null;
  contractIsUpgradeable: boolean | null;
  contractAdmin?: string | null;
  contractOwner?: string | null;
  contractHasTimelock?: boolean | null;

  protocolDependencies?: string[];
};

// Scored pool object returned to UI
export type TraxrScoreResult = {
  poolId: string;
  score: number;    // 0-100
  ctsNodes: number; // 1-6
  nodes: TraxrNodeBreakdown;
  warnings: string[];
  updatedAt: string;

  // Full normalized metrics
  metrics: AvaxPoolMetrics;

  // Convenience duplicates (used by UI/search)
  tokenAName?: string;
  tokenASymbol?: string;
  tokenBName?: string;
  tokenBSymbol?: string;
};

// Time-series snapshot for a single pool across cached data files.
export type TraxrTrendPoint = {
  timestamp: string;
  score: number;
  ctsNodes: number;
  nodes: TraxrNodeBreakdown;
  warnings: string[];
  metrics: AvaxPoolMetrics;
};

// -------------------------------
// TRAXR Console semantic layer
// -------------------------------

// Canonical metric identifiers used by the Console brain
export type TraxrMetric =
  | "DEPTH"
  | "ACTIVITY"
  | "IMPACT"
  | "STABILITY"
  | "TRUST"
  | "FEE";

// Interaction archetypes between metrics
export type MetricInteraction =
  | "USAGE_EFFICIENCY"
  | "LIQUIDITY_STRESS"
  | "FALSE_SECURITY"
  | "RISK_AMPLIFICATION"
  | "COST_PRESSURE"
  | "STRUCTURAL_CONTEXT";

// Normalized metric pair key
export type MetricPairKey = `${TraxrMetric}:${TraxrMetric}`;

// Mapping from TraxrNodeBreakdown keys to TraxrMetric identifiers
export const nodeKeyToMetric: Record<keyof TraxrNodeBreakdown, TraxrMetric> = {
  depth: "DEPTH",
  activity: "ACTIVITY",
  impact: "IMPACT",
  stability: "STABILITY",
  trust: "TRUST",
  fee: "FEE",
};
