import fs from "fs";
import path from "path";

import { SAMPLE_POOLS } from "./sampleData";
import { buildWarnings, toScoreResult } from "./scoringAdapter";
import { TraxrScoreResult, AvaxPoolMetrics } from "./types";

const REFRESH_MS = 5 * 60 * 1000;
const TOP_N = Infinity;

const FALLBACK_SAMPLE = process.env.TRAXR_FALLBACK_SAMPLE === "true";
const LOCAL_POOLS_PATH = process.env.TRAXR_LOCAL_POOLS_PATH || "";
const LOCAL_POOLS_DIR = path.join(process.cwd(), "data");

// In-memory cache
let cache = new Map<string, TraxrScoreResult>();
let cacheList: TraxrScoreResult[] = [];
let lastRefresh = 0;
let schedulerStarted = false;

const poolKey = (mintA: string, mintB: string) =>
  [mintA.toUpperCase(), mintB.toUpperCase()].sort().join("_");

/* ---------------------------------- */
/* Pool matching (search)              */
/* ---------------------------------- */

function matchesPoolTokens(
  pool: AvaxPoolMetrics,
  tokenA: string,
  tokenB: string,
): boolean {
  const canon = (v?: string) => v?.toUpperCase().trim();

  const poolTokens = [
    canon(pool.mintA),
    canon(pool.mintB),
    canon(pool.tokenASymbol),
    canon(pool.tokenBSymbol),
    canon(pool.tokenAName),
    canon(pool.tokenBName),
    canon(pool.tokenAAddress),
    canon(pool.tokenBAddress),
  ].filter(Boolean) as string[];

  return poolTokens.includes(canon(tokenA)!) &&
         poolTokens.includes(canon(tokenB)!);
}

/* ---------------------------------- */
/* Fetch + cache                       */
/* ---------------------------------- */

async function fetchAvaxPools(): Promise<AvaxPoolMetrics[]> {
  const local = loadLocalPools().map(normalizePool);
  if (local.length) return local.slice(0, TOP_N);

  if (FALLBACK_SAMPLE) {
    console.warn("[TRAXR-AVAX] Using SAMPLE_POOLS fallback");
    return SAMPLE_POOLS.slice(0, TOP_N);
  }

  return [];
}

async function refreshCache() {
  const pools = await fetchAvaxPools();
  const next = new Map<string, TraxrScoreResult>();
  const nextList: TraxrScoreResult[] = [];

  for (const p of pools) {
    const { score, nodes, ctsNodes } = toScoreResult(p);

    const item: TraxrScoreResult = {
      poolId: p.poolId,
      score,
      ctsNodes,
      nodes,
      warnings: buildWarnings(p, nodes),
      updatedAt: p.poolUpdatedAt || new Date().toISOString(),

      // PASS-THROUGH (NO TRANSFORM)
      metrics: p,

      tokenAName: p.tokenAName,
      tokenASymbol: p.tokenASymbol,
      tokenBName: p.tokenBName,
      tokenBSymbol: p.tokenBSymbol,
    };

    next.set(poolKey(p.mintA, p.mintB), item);
    nextList.push(item);
  }

  cache = next;
  cacheList = nextList.sort((a, b) => b.score - a.score);
  lastRefresh = Date.now();
}

/* ---------------------------------- */
/* Public API                          */
/* ---------------------------------- */

export async function ensureTraxrCache() {
  if (!lastRefresh || Date.now() - lastRefresh > REFRESH_MS * 2) {
    try {
      await refreshCache();
    } catch (e) {
      console.error("[TRAXR-AVAX] cache refresh failed", e);
    }
  }
}

export async function getTraxrScore(
  mintA: string,
  mintB: string,
): Promise<TraxrScoreResult | null> {
  await ensureTraxrCache();

  const exact = cache.get(poolKey(mintA, mintB));
  if (exact) return exact;

  return (
    cacheList.find((p) =>
      matchesPoolTokens(p.metrics, mintA, mintB),
    ) ?? null
  );
}

export async function getTopPools(): Promise<TraxrScoreResult[]> {
  await ensureTraxrCache();
  return cacheList;
}

export function startTraxrScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(() => {
    refreshCache().catch((e) =>
      console.error("[TRAXR-AVAX] background refresh failed", e),
    );
  }, REFRESH_MS);
}

startTraxrScheduler();

/* ---------------------------------- */
/* Local cache loader                  */
/* ---------------------------------- */

function resolveLocalPoolsPath() {
  if (LOCAL_POOLS_PATH) return LOCAL_POOLS_PATH;

  try {
    const files = fs.readdirSync(LOCAL_POOLS_DIR);
    const parseTimestamp = (name: string) => {
      const match = /^avaxPools_(\d{8})_(\d{6})Z\.json$/i.exec(name);
      if (!match) return null;
      const date = match[1];
      const time = match[2];
      const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}Z`;
      const ms = Date.parse(iso);
      return Number.isNaN(ms) ? null : ms;
    };
    const candidates = files
      .filter((name) => /^avaxPools_.*\.json$/i.test(name))
      .map((name) => {
        const fullPath = path.join(LOCAL_POOLS_DIR, name);
        const stat = fs.statSync(fullPath);
        return { name, fullPath, mtimeMs: stat.mtimeMs, stampMs: parseTimestamp(name) };
      })
      .sort((a, b) => {
        const aMs = a.stampMs ?? a.mtimeMs;
        const bMs = b.stampMs ?? b.mtimeMs;
        return bMs - aMs;
      });

    if (candidates.length) return candidates[0].fullPath;
  } catch {}

  return path.join(LOCAL_POOLS_DIR, "avaxPools.json");
}

function loadLocalPools(): any[] {
  const resolvedPath = resolveLocalPoolsPath();
  if (!fs.existsSync(resolvedPath)) return [];

  try {
    const raw = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    if (Array.isArray(raw)) {
      console.warn(
        `[TRAXR-AVAX] Loaded ${raw.length} pools from ${resolvedPath}`,
      );
      return raw;
    }
  } catch (e) {
    console.warn("[TRAXR-AVAX] Failed to load local pools", e);
  }

  return [];
}

/* ---------------------------------- */
/* NORMALIZATION (MOST IMPORTANT)      */
/* ---------------------------------- */

export function normalizePool(p: any): AvaxPoolMetrics {
  const tokenASymbol = p.tokenASymbol ?? p.tokenA ?? p.symbolA ?? p.mintA;
  const tokenBSymbol = p.tokenBSymbol ?? p.tokenB ?? p.symbolB ?? p.mintB;
  const tokenAName = p.tokenAName ?? p.tokenNameA;
  const tokenBName = p.tokenBName ?? p.tokenNameB;
  const mintA = tokenASymbol || tokenAName || p.mintA || "UNKNOWN";
  const mintB = tokenBSymbol || tokenBName || p.mintB || "SINGLE";
  const poolId = p.poolId || p.poolRef || p.id || `${mintA}_${mintB}`;
  const poolAddress =
    typeof p.poolAddress === "string" && p.poolAddress.startsWith("0x")
      ? p.poolAddress
      : null;

  const liquidityDepthUsd =
    typeof p.liquidityDepthUsd === "number"
      ? p.liquidityDepthUsd
      : typeof p.liquidityUsd === "number"
        ? p.liquidityUsd
        : 0;

  return {
    poolId,
    poolRef: p.poolRef ?? undefined,
    mintA,
    mintB,
    poolAddress,
    addressSource: p.addressSource ?? null,
    entityType: p.entityType ?? null,
    chain: p.chain ?? null,
    dataSource: p.dataSource ?? null,
    confidenceLevel: p.confidenceLevel ?? null,
    dex: p.dex ?? "Unknown",

    tokenAName,
    tokenASymbol,
    tokenBName,
    tokenBSymbol,
    tokenAAddress: p.tokenAAddress ?? p.tokenA,
    tokenBAddress: p.tokenBAddress ?? p.tokenB,
    poolUpdatedAt: typeof p.poolUpdatedAt === "string" ? p.poolUpdatedAt : undefined,

    /* ------------------------------- */
    /* Backward-compatible fields     */
    /* ------------------------------- */

    liquidityUsd: typeof p.liquidityUsd === "number" ? p.liquidityUsd : liquidityDepthUsd,
    volume24hUsd: typeof p.volume24hUsd === "number" ? p.volume24hUsd : 0,
    volume7dUsd: typeof p.volume7dUsd === "number" ? p.volume7dUsd : null,

    tx24h: p.tx24h ?? 0,
    tx7d: p.tx7d ?? null,

    feePct: typeof p.feePct === "number" ? p.feePct : null,
    volatilityPct: typeof p.volatilityPct === "number" ? p.volatilityPct : null,

    priceImpactPct: p.priceImpactPct ?? null,
    dataAgeHours: p.dataAgeHours ?? 0,

    /* ------------------------------- */
    /* AVAX pool + contract inputs    */
    /* ------------------------------- */

    liquidityDepthUsd,
    liquidityConcentrationPct:
      typeof p.liquidityConcentrationPct === "number"
        ? p.liquidityConcentrationPct
        : null,
    feeStabilityPct:
      typeof p.feeStabilityPct === "number"
        ? p.feeStabilityPct
        : null,
    volatilityImpactPct:
      typeof p.volatilityImpactPct === "number"
        ? p.volatilityImpactPct
        : null,

    contractIsProxy:
      typeof p.contractIsProxy === "boolean" ? p.contractIsProxy : null,
    contractIsUpgradeable:
      typeof p.contractIsUpgradeable === "boolean"
        ? p.contractIsUpgradeable
        : null,
    contractAdmin: p.contractAdmin ?? null,
    contractOwner: p.contractOwner ?? null,
    contractHasTimelock:
      typeof p.contractHasTimelock === "boolean"
        ? p.contractHasTimelock
        : null,

    protocolDependencies: Array.isArray(p.protocolDependencies)
      ? p.protocolDependencies
      : [],
  };
}
