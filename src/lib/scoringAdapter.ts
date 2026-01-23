// AVAX scoring is provided by the private @crosswalk.pro/traxr-cts-avax package.
// Keep this adapter thin so the rest of the app can stay unchanged.

import type { AvaxPoolMetrics, TraxrNodeBreakdown } from "./types";
import {
  buildWarnings as buildWarningsBase,
  toScoreResult as toScoreResultBase,
} from "@crosswalk.pro/traxr-cts-avax";

export type TraxrScoreResult = {
  score: number;
  nodes: TraxrNodeBreakdown;
  ctsNodes: number;
  metrics: AvaxPoolMetrics;
};

export const toScoreResult = (m: AvaxPoolMetrics): TraxrScoreResult => {
  const { score, nodes, ctsNodes } = toScoreResultBase(m);
  return { score, nodes, ctsNodes, metrics: m };
};

export const buildWarnings = (m: AvaxPoolMetrics, n: TraxrNodeBreakdown) =>
  buildWarningsBase(m, n);
