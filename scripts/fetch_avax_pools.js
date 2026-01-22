/**
 * TRAXR-AVAX
 * DeFiLlama AMM pool fetch + enrich (single step)
 */

const fs = require("fs");
const path = require("path");
const { Contract, JsonRpcProvider, isAddress } = require("ethers");

const OUTPUT_DIR = path.join(__dirname, "..", "data");
const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";
const DEFILLAMA_POOL_URL = "https://yields.llama.fi/pool/";
const TARGET_CHAIN = "Avalanche";
const RPC_URL =
  process.env.TRAXR_RPC_URL ||
  "https://api.avax.network/ext/bc/C/rpc";

// ---- config ----

// When empty, allow all projects except those denied below.
const ALLOW_DEX = [];

const DENY_DEX = [
  "merkl",
  "lend",
  "staking",
  "stake",
  "perp",
  "yield",
  "vault",
  "benqi",
  "ankr",
  "folks",
  "bridge",
  "derivatives",
];

const RESOLVE_POOL_ADDRESSES =
  process.env.TRAXR_RESOLVE_POOL_ADDRESSES === "true";
const RESOLVE_LIMIT = Number(process.env.TRAXR_RESOLVE_LIMIT || 200);
const RESOLVE_DELAY_MS = Number(process.env.TRAXR_RESOLVE_DELAY_MS || 150);

const FACTORY_UNISWAP_V2 =
  process.env.TRAXR_FACTORY_UNISWAP_V2 || "";
const FACTORY_PANGOLIN_V2 =
  process.env.TRAXR_FACTORY_PANGOLIN_V2 ||
  "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10";
const FACTORY_SUSHI_V2 =
  process.env.TRAXR_FACTORY_SUSHI_V2 ||
  "0xc35DADB65012eC5796536bD9864eD8773aBc74C4";
const FACTORY_JOE_V2 =
  process.env.TRAXR_FACTORY_JOE_V2 || "";
const FACTORY_UNISWAP_V3 =
  process.env.TRAXR_FACTORY_UNISWAP_V3 || "";

const V2_FACTORY_ABI = [
  "function getPair(address,address) view returns (address)",
];
const V3_FACTORY_ABI = [
  "function getPool(address,address,uint24) view returns (address)",
];

const provider = new JsonRpcProvider(RPC_URL);

// ---- utils ----

function log(step, msg, extra = "") {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [TRAXR-AVAX][${step}] ${msg}`, extra);
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "").replace("Z", "Z");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAddress(value) {
  if (!isAddress(value)) return null;
  return value;
}

// ---- fetch ----

async function fetchPools() {
  log("FETCH", "Requesting pools from DeFiLlama", DEFILLAMA_POOLS_URL);

  const res = await fetch(DEFILLAMA_POOLS_URL);
  if (!res.ok) {
    throw new Error(`DeFiLlama fetch failed: ${res.status}`);
  }

  const json = await res.json();
  const pools = json.data || [];

  log("FETCH", "Total pools received", pools.length);
  return pools;
}

// ---- filters ----

function isAllowedDex(dex) {
  const d = dex.toLowerCase();
  if (DENY_DEX.some((x) => d.includes(x))) return false;
  if (ALLOW_DEX.length === 0) return true;
  return ALLOW_DEX.some((x) => d.includes(x));
}

function isValidAmmPool(p) {
  if (p.chain !== TARGET_CHAIN) return false;
  if (!p.symbol || !p.symbol.includes("-")) return false;

  const [a, b] = p.symbol.split("-");
  if (!a || !b) return false;
  if (/^\d+$/.test(a) || /^\d+$/.test(b)) return false;

  if (!isAllowedDex(p.project || "")) return false;

  const tvl = Number(p.tvlUsd || 0);
  if (tvl <= 0) return false;

  return true;
}

// ---- enrich ----

function extractPoolAddressFromDetails(details) {
  if (!details || typeof details !== "object") return null;

  const candidates = [
    details.poolMeta?.address,
    details.poolMeta?.poolAddress,
    details.poolMeta?.pairAddress,
    details.poolMeta?.lpToken,
    details.address,
    details.pool?.address,
    details.pool?.poolMeta?.address,
    details.pool?.poolMeta?.poolAddress,
    details.pool?.poolMeta?.pairAddress,
    details.pool?.poolMeta?.lpToken,
  ];

  for (const value of candidates) {
    if (isAddress(value)) return value;
  }

  return null;
}

function normalizeDexKey(project) {
  return (project || "").toLowerCase().trim();
}

function resolveFactoryForDex(project) {
  const dex = normalizeDexKey(project);
  if (dex.includes("pangolin")) return { type: "v2", address: FACTORY_PANGOLIN_V2 };
  if (dex.includes("sushi")) return { type: "v2", address: FACTORY_SUSHI_V2 };
  if (dex.includes("joe-v2")) return { type: "v2", address: FACTORY_JOE_V2 };
  if (dex === "joe") return { type: "v2", address: FACTORY_JOE_V2 };
  if (dex.includes("uniswap-v2")) return { type: "v2", address: FACTORY_UNISWAP_V2 };
  if (dex === "uniswap") return { type: "v2", address: FACTORY_UNISWAP_V2 };
  if (dex.includes("uniswap-v3")) return { type: "v3", address: FACTORY_UNISWAP_V3 };
  return null;
}

function normalizeV3Fee(fee) {
  if (fee == null) return null;
  const n = Number(fee);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 1000) return Math.round(n);
  if (n <= 1) return Math.round(n * 10000);
  return Math.round(n * 100);
}

async function resolvePoolAddressOnChain(p, tokenAAddress, tokenBAddress) {
  const factory = resolveFactoryForDex(p.project);
  if (!factory || !isAddress(factory.address)) return null;
  if (!isAddress(tokenAAddress) || !isAddress(tokenBAddress)) return null;

  try {
    if (factory.type === "v2") {
      const contract = new Contract(factory.address, V2_FACTORY_ABI, provider);
      const pair = await contract.getPair(tokenAAddress, tokenBAddress);
      return isAddress(pair) && pair !== "0x0000000000000000000000000000000000000000"
        ? pair
        : null;
    }

    if (factory.type === "v3") {
      const fee = normalizeV3Fee(p.fee);
      if (!fee) return null;
      const contract = new Contract(factory.address, V3_FACTORY_ABI, provider);
      const pool = await contract.getPool(tokenAAddress, tokenBAddress, fee);
      return isAddress(pool) && pool !== "0x0000000000000000000000000000000000000000"
        ? pool
        : null;
    }
  } catch (err) {
    log("RESOLVE", "On-chain resolve failed", p.pool);
  }

  return null;
}

async function resolvePoolAddress(poolId) {
  if (!poolId) return null;
  const url = `${DEFILLAMA_POOL_URL}${poolId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return extractPoolAddressFromDetails(json?.data || json);
  } catch (err) {
    log("RESOLVE", "Pool address lookup failed", poolId);
    return null;
  }
}

function normalizeAndEnrich(p, resolvedAddress) {
  const [tokenA, tokenB] = p.symbol.split("-");
  const underlying = Array.isArray(p.underlyingTokens)
    ? p.underlyingTokens
    : [];

  const liquidityUsd = Number(p.tvlUsd || 0);
  const volume24hUsd = Number(p.volumeUsd1d || 0);
  const volume7dUsd = Number(p.volumeUsd7d || 0);

  const volatilityImpactPct =
    liquidityUsd > 0
      ? Math.min(100, (volume24hUsd / liquidityUsd) * 100)
      : 0;

  const poolMetaAddress =
    p.poolMeta?.address ||
    p.poolMeta?.poolAddress ||
    p.poolMeta?.pairAddress ||
    p.poolMeta?.lpToken ||
    null;

  const poolAddress =
    resolvedAddress ||
    (isAddress(poolMetaAddress) ? poolMetaAddress : null) ||
    (isAddress(p.pool) ? p.pool : null) ||
    null;

  const addressSource = poolAddress
    ? resolvedAddress
      ? "resolved"
      : poolMetaAddress
      ? "defillama-meta"
      : "pool-id"
    : "unresolved";

  const protocolDependencies =
    p.rewardTokens?.length ? ["incentives"] : [];

  return {
    poolRef: p.pool,
    poolId: p.pool,
    poolAddress,
    addressSource,

    entityType: "amm",

    dex: p.project,
    chain: p.chain,

    tokenAName: tokenA,
    tokenASymbol: tokenA,
    tokenBName: tokenB,
    tokenBSymbol: tokenB,
    tokenAAddress: toAddress(underlying[0]),
    tokenBAddress: toAddress(underlying[1]),

    liquidityUsd,
    volume24hUsd,
    volume7dUsd,

    tx24h: null,
    tx7d: null,
    feePct: p.fee ? Number(p.fee) / 100 : null,

    liquidityDepthUsd: liquidityUsd,
    liquidityConcentrationPct: null,
    feeStabilityPct: null,
    volatilityImpactPct,

    contractIsProxy: null,
    contractIsUpgradeable: null,
    contractAdmin: null,
    contractOwner: null,
    contractHasTimelock: null,

    protocolDependencies,

    confidenceLevel: poolAddress ? "medium" : "low",

    poolUpdatedAt: new Date().toISOString(),
    dataSource: "defillama",
  };
}

// ---- main ----

(async () => {
  try {
    log("INIT", "Starting TRAXR-AVAX fetch + enrich");

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const allPools = await fetchPools();

    log("FILTER", "Filtering Avalanche AMM pools");
    const ammPools = allPools.filter(isValidAmmPool);
    log("FILTER", "Valid AMM pools", ammPools.length);

    log("ENRICH", "Normalizing and enriching pools");
    const enriched = [];
    let resolvedCount = 0;

    for (const pool of ammPools) {
      const tokenAAddress = toAddress(pool.underlyingTokens?.[0]);
      const tokenBAddress = toAddress(pool.underlyingTokens?.[1]);

      let resolvedAddress = null;
      if (RESOLVE_POOL_ADDRESSES && resolvedCount < RESOLVE_LIMIT) {
        resolvedAddress = await resolvePoolAddress(pool.pool);
        if (!resolvedAddress) {
          resolvedAddress = await resolvePoolAddressOnChain(
            pool,
            tokenAAddress,
            tokenBAddress,
          );
        }
        if (resolvedAddress) resolvedCount += 1;
        if (RESOLVE_DELAY_MS > 0) {
          await sleep(RESOLVE_DELAY_MS);
        }
      }
      enriched.push(normalizeAndEnrich(pool, resolvedAddress));
    }

    if (RESOLVE_POOL_ADDRESSES) {
      log("RESOLVE", "Resolved pool addresses", resolvedCount);
    }

    const outFile = path.join(
      OUTPUT_DIR,
      `avaxPools_${timestampSlug()}.json`
    );

    log("WRITE", "Writing snapshot", outFile);
    fs.writeFileSync(outFile, JSON.stringify(enriched, null, 2));

    log(
      "DONE",
      `Snapshot complete. Enriched AMM pools saved: ${enriched.length}`
    );
  } catch (err) {
    log("ERROR", "Fetcher failed", err.message);
    console.error(err);
    process.exit(1);
  }
})();
