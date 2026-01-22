// TRAXR-AVAX node explanations
// Deterministic, non-evaluative, context-aware interpretation layer (not an oracle)

type InteractionArchetype =
  | "USAGE_EFFICIENCY"
  | "LIQUIDITY_STRESS"
  | "FALSE_SECURITY"
  | "CONCENTRATION_DYNAMICS"
  | "COST_PRESSURE"
  | "STRUCTURAL";

const PAIR_ARCHETYPES: Record<PairKey, InteractionArchetype> = {
  activity_depth: "USAGE_EFFICIENCY",
  depth_impact: "LIQUIDITY_STRESS",
  depth_stability: "FALSE_SECURITY",
  activity_stability: "USAGE_EFFICIENCY",
  activity_trust: "CONCENTRATION_DYNAMICS",
  depth_trust: "CONCENTRATION_DYNAMICS",
  activity_fee: "COST_PRESSURE",
};

type TripleArchetype =
  | "MARKET_STRUCTURE"
  | "EXECUTION_PROFILE"
  | "DEPENDENCY_CONTEXT"
  | "RISK_SURFACE"
  | "STRUCTURAL";

const TRIPLE_ARCHETYPES: Partial<Record<TripleKey, TripleArchetype>> = {
  activity_depth_stability: "MARKET_STRUCTURE",
  activity_depth_impact: "EXECUTION_PROFILE",
  activity_trust_depth: "DEPENDENCY_CONTEXT",
};

const TRIPLE_ARCHETYPE_EXPLANATIONS: Record<TripleArchetype, Explanation> = {
  MARKET_STRUCTURE: {
    title: "Market Structure",
    body:
      "Liquidity depth, concentration, and fee stability describe the pool's structural resilience.",
  },
  EXECUTION_PROFILE: {
    title: "Execution Profile",
    body:
      "Depth, concentration, and impact together shape execution quality under trade pressure.",
  },
  DEPENDENCY_CONTEXT: {
    title: "Dependency Context",
    body:
      "Liquidity and contract posture combine with dependencies to shape operational risk.",
  },
  RISK_SURFACE: {
    title: "Risk Surface",
    body:
      "Multiple dimensions combine to shape the pool's exposure profile.",
  },
  STRUCTURAL: {
    title: "Context Overview",
    body:
      "The selected metrics provide high-level structural context.",
  },
};

const ARCHETYPE_EXPLANATIONS: Record<InteractionArchetype, Explanation> = {
  USAGE_EFFICIENCY: {
    title: "Concentration vs Depth",
    body:
      "This combination evaluates how liquidity depth aligns with concentration risk.",
  },
  LIQUIDITY_STRESS: {
    title: "Liquidity Stress",
    body:
      "Depth and impact show how liquidity absorbs trade pressure.",
  },
  FALSE_SECURITY: {
    title: "Stability vs Size",
    body:
      "Liquidity size alone does not guarantee stable fee behavior.",
  },
  CONCENTRATION_DYNAMICS: {
    title: "Concentration Dynamics",
    body:
      "Liquidity concentration and contract posture shape control risk.",
  },
  COST_PRESSURE: {
    title: "Dependency Pressure",
    body:
      "Dependency flags can influence risk even when depth is healthy.",
  },
  STRUCTURAL: {
    title: "Context Overview",
    body:
      "The selected metrics provide structural context for this pool.",
  },
};

export type TraxrNodes = {
  depth: number;
  activity: number;
  impact: number;
  stability: number;
  trust: number;
  fee: number;
};

export type Explanation = {
  title: string;
  body: string;
};

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

type Band = "low" | "mid" | "high";

function band(v: number): Band {
  if (v >= 70) return "high";
  if (v >= 40) return "mid";
  return "low";
}

function pairKey(a: keyof TraxrNodes, b: keyof TraxrNodes) {
  return [a, b].sort().join("_") as PairKey;
}

function tripleKey(
  a: keyof TraxrNodes,
  b: keyof TraxrNodes,
  c: keyof TraxrNodes,
) {
  return [a, b, c].sort().join("_") as TripleKey;
}

/* --------------------------------------------------
 * 1. LOCAL (single-metric)
 * -------------------------------------------------- */

export function getLocalExplanation(
  node: keyof TraxrNodes,
  value: number,
): Explanation {
  const b = band(value);

  const LOCAL: Record<keyof TraxrNodes, Record<Band, Explanation>> = {
    depth: {
      high: {
        title: "Liquidity Depth",
        body:
          "Depth is strong relative to typical AVAX swap sizes.",
      },
      mid: {
        title: "Liquidity Depth",
        body:
          "Depth supports small to medium trades without major disruption.",
      },
      low: {
        title: "Liquidity Depth",
        body:
          "Depth is limited; execution may be sensitive to trade size.",
      },
    },
    activity: {
      high: {
        title: "Concentration",
        body:
          "Liquidity is widely distributed across LPs.",
      },
      mid: {
        title: "Concentration",
        body:
          "Liquidity distribution is moderately concentrated.",
      },
      low: {
        title: "Concentration",
        body:
          "Liquidity appears highly concentrated among LPs.",
      },
    },
    impact: {
      high: {
        title: "Volatility Impact",
        body:
          "Trades generally result in limited price movement.",
      },
      mid: {
        title: "Volatility Impact",
        body:
          "Typical trades are expected to cause moderate price movement.",
      },
      low: {
        title: "Volatility Impact",
        body:
          "Price is highly sensitive to trades due to pool structure.",
      },
    },
    stability: {
      high: {
        title: "Fee Stability",
        body:
          "Fee changes appear stable over recent periods.",
      },
      mid: {
        title: "Fee Stability",
        body:
          "Fee adjustments are observed intermittently.",
      },
      low: {
        title: "Fee Stability",
        body:
          "Fee behavior appears volatile or unstable.",
      },
    },
    trust: {
      high: {
        title: "Contract Risk",
        body:
          "Contract controls appear minimal or well constrained.",
      },
      mid: {
        title: "Contract Risk",
        body:
          "Contract controls exist but are partially constrained.",
      },
      low: {
        title: "Contract Risk",
        body:
          "Contract controls appear elevated (proxy/upgradeable/admin).",
      },
    },
    fee: {
      high: {
        title: "Dependencies",
        body:
          "Protocol dependencies are minimal or absent.",
      },
      mid: {
        title: "Dependencies",
        body:
          "Some protocol dependencies are present.",
      },
      low: {
        title: "Dependencies",
        body:
          "Multiple protocol dependencies are present.",
      },
    },
  };

  return LOCAL[node][b];
}

/* --------------------------------------------------
 * 2. VALID COMBINATIONS (UI constraint)
 * -------------------------------------------------- */

export const VALID_COMBINATIONS: Record<
  keyof TraxrNodes,
  (keyof TraxrNodes)[]
> = {
  depth: ["activity", "impact", "stability", "trust"],
  activity: ["depth", "impact", "stability", "trust", "fee"],
  impact: ["depth", "activity", "stability"],
  stability: ["depth", "activity", "impact"],
  trust: ["depth", "activity"],
  fee: ["activity"],
};

/* --------------------------------------------------
 * 3. PAIR EXPLANATIONS (2 metrics)
 * -------------------------------------------------- */

type PairKey =
  | "activity_depth"
  | "depth_impact"
  | "depth_stability"
  | "activity_stability"
  | "activity_trust"
  | "depth_trust"
  | "activity_fee";

type PairBandKey =
  | "low_low" | "low_mid" | "low_high"
  | "mid_low" | "mid_mid" | "mid_high"
  | "high_low" | "high_mid" | "high_high";

const PAIR_ORDER: Record<PairKey, [keyof TraxrNodes, keyof TraxrNodes]> = {
  activity_depth: ["activity", "depth"],
  depth_impact: ["depth", "impact"],
  depth_stability: ["depth", "stability"],
  activity_stability: ["activity", "stability"],
  activity_trust: ["activity", "trust"],
  depth_trust: ["depth", "trust"],
  activity_fee: ["activity", "fee"],
};

const PAIRS: Partial<Record<
  PairKey,
  Partial<Record<PairBandKey, Explanation>>
>> = {
  activity_depth: {
    high_high: {
      title: "Healthy Depth",
      body:
        "Depth is strong and liquidity is well distributed.",
    },
    high_low: {
      title: "Concentrated Depth",
      body:
        "Depth is present but concentrated among fewer LPs.",
    },
    low_high: {
      title: "Distributed but Thin",
      body:
        "Liquidity is distributed but overall depth is limited.",
    },
    low_low: {
      title: "Thin and Concentrated",
      body:
        "Depth is limited and liquidity appears concentrated.",
    },
    mid_mid: {
      title: "Moderate Coverage",
      body:
        "Depth and distribution are balanced at moderate levels.",
    },
  },
  depth_impact: {
    high_high: {
      title: "Efficient Execution",
      body:
        "Depth supports low price sensitivity for trades.",
    },
    low_high: {
      title: "Execution Sensitive",
      body:
        "Limited depth results in noticeable price movement per trade.",
    },
  },
  depth_stability: {
    high_high: {
      title: "Stable Fee Structure",
      body:
        "Depth and fee stability are aligned.",
    },
    low_high: {
      title: "Thin but Stable",
      body:
        "Fee stability exists despite limited depth.",
    },
  },
  activity_trust: {
    high_high: {
      title: "Distributed Controls",
      body:
        "Liquidity is distributed and contract controls appear constrained.",
    },
    low_low: {
      title: "Concentrated Control",
      body:
        "Liquidity is concentrated and contract controls are elevated.",
    },
  },
  depth_trust: {
    high_high: {
      title: "Mature Structure",
      body:
        "Depth and contract posture are well aligned.",
    },
    low_low: {
      title: "Fragile Structure",
      body:
        "Thin liquidity and elevated contract controls.",
    },
  },
  activity_fee: {
    high_high: {
      title: "Minimal Dependencies",
      body:
        "Liquidity is distributed and dependency flags are minimal.",
    },
    low_high: {
      title: "Dependency Exposure",
      body:
        "Dependencies appear elevated despite concentrated liquidity.",
    },
  },
};

/* --------------------------------------------------
 * 4. TRIPLE EXPLANATIONS (3 metrics)
 * -------------------------------------------------- */

type TripleKey =
  | "activity_depth_stability"
  | "activity_depth_impact"
  | "activity_trust_depth";

// ----------------------------------
// Dev-time integrity checks
// ----------------------------------
if (process.env.NODE_ENV !== "production") {
  for (const key of Object.keys(PAIRS) as PairKey[]) {
    if (!PAIR_ORDER[key]) {
      console.warn(`[TRAXR-AVAX] Missing PAIR_ORDER for ${key}`);
    }
  }

  for (const key of Object.keys(TRIPLE_ARCHETYPES) as TripleKey[]) {
    if (!TRIPLE_ARCHETYPE_EXPLANATIONS[TRIPLE_ARCHETYPES[key]!]) {
      console.warn(
        `[TRAXR-AVAX] Missing triple archetype explanation for ${key}`,
      );
    }
  }
}

/* --------------------------------------------------
 * 5. MAIN CONTEXTUAL DISPATCH
 * -------------------------------------------------- */

export function getContextualExplanationForSelection(
  selected: (keyof TraxrNodes)[],
  nodes: TraxrNodes,
): Explanation[] {
  if (selected.length === 1) {
    return [getLocalExplanation(selected[0], nodes[selected[0]])];
  }

  // 3-metric
  if (selected.length === 3) {
    const key = tripleKey(selected[0], selected[1], selected[2]);
    const archetype = TRIPLE_ARCHETYPES[key] ?? "STRUCTURAL";
    return [TRIPLE_ARCHETYPE_EXPLANATIONS[archetype]];
  }

  // 2-metric
  if (selected.length === 2) {
    const [a, b] = selected;
    const key = pairKey(a, b);

    // Try band-specific explanation
    const map = PAIRS[key];
    if (map) {
      const order = PAIR_ORDER[key];
      if (order) {
        const [first, second] = order;
        const v1 = band(nodes[first]);
        const v2 = band(nodes[second]);
        const entry = map[`${v1}_${v2}` as PairBandKey];
        if (entry) return [entry];
      }
    }

    // Fallback to archetype explanation
    const archetype = PAIR_ARCHETYPES[key] ?? "STRUCTURAL";
    return [ARCHETYPE_EXPLANATIONS[archetype]];
  }

  // Fallback (never empty)
  return [
    {
      title: "Context Overview",
      body:
        "The selected metrics provide structural context for interpreting this pool.",
    },
  ];
}
