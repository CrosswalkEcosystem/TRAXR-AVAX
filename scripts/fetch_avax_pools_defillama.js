/**
 * TRAXR-AVAX
 * DeFiLlama AMM pools -> normalize -> best-effort address resolution (single run)
 */

const fs = require("fs");
const path = require("path");
let ethers;
try {
  // Optional dependency for ABI encoding and RPC calls.
  // eslint-disable-next-line global-require
  ethers = require("ethers");
} catch {
  ethers = null;
}

const OUTPUT_DIR = path.join(__dirname, "..", "data");
const FACTORY_CONFIG_PATH =
  process.env.TRAXR_DEX_FACTORIES_PATH ||
  path.join(__dirname, "..", "data", "avaxDexFactories.json");
const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";
const TARGET_CHAIN = "Avalanche";
const AVAX_RPC_URL = process.env.AVAX_RPC_URL || "";

// ---- config ----

// When empty, allow all projects except those denied below.
const ALLOW_DEX = [];

const DENY_DEX = [
  "merkl",
  "lend",
  "lending",
  "staking",
  "stake",
  "perp",
  "perps",
  "yield",
  "vault",
  "benqi",
  "ankr",
  "folks",
  "bridge",
  "derivatives",
];

const DEFAULT_V3_FEE_TIERS = [500, 3000, 10000];

// ---- utils ----

function log(step, msg, extra = "") {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [TRAXR-AVAX][${step}] ${msg}`, extra);
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "").replace("Z", "Z");
}

function isAddress(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function toAddress(value) {
  return isAddress(value) ? value : null;
}

function safeLower(value) {
  return (value || "").toLowerCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const d = safeLower(dex);
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

// ---- config load ----

function loadFactoryConfig() {
  if (!fs.existsSync(FACTORY_CONFIG_PATH)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(FACTORY_CONFIG_PATH, "utf8"));
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.dexes)) return raw.dexes;
  } catch (err) {
    log("CONFIG", "Failed to parse factory config", err.message);
  }

  return null;
}

function matchDexConfigs(project, configs) {
  const dex = safeLower(project);
  return configs.filter((entry) => {
    const match = entry.match || entry.dex;
    if (!match) return false;
    if (Array.isArray(match)) {
      return match.some((m) => dex.includes(safeLower(m)));
    }
    return dex.includes(safeLower(match));
  });
}

// ---- resolver handlers ----

function extractPoolAddressFromMeta(p) {
  const candidates = [
    p.poolMeta?.address,
    p.poolMeta?.pairAddress,
    p.poolMeta?.lpToken,
  ];
  for (const value of candidates) {
    if (isAddress(value)) return value;
  }
  return null;
}

async function resolveViaFactory(provider, dexConfig, tokenA, tokenB, feeTiers) {
  if (!ethers || !provider) return null;
  if (!isAddress(dexConfig.factory)) return null;
  if (!isAddress(tokenA) || !isAddress(tokenB)) return null;

  const type = safeLower(dexConfig.type || "");

  try {
    if (type === "uniswapv2" || type === "uniswap-v2") {
      const factory = new ethers.Contract(
        dexConfig.factory,
        ["function getPair(address,address) view returns (address)"],
        provider,
      );
      const pair = await factory.getPair(tokenA, tokenB);
      return isAddress(pair) ? pair : null;
    }

    if (type === "uniswapv3" || type === "uniswap-v3") {
      const factory = new ethers.Contract(
        dexConfig.factory,
        ["function getPool(address,address,uint24) view returns (address)"],
        provider,
      );
      for (const fee of feeTiers) {
        const pool = await factory.getPool(tokenA, tokenB, fee);
        if (isAddress(pool)) return pool;
      }
      return null;
    }

    if (type === "traderjoe-lb" || type === "joe-lb") {
      return null;
    }
  } catch {
    return null;
  }

  return null;
}

async function resolvePoolAddress(p, provider, configs) {
  const poolMetaAddress = extractPoolAddressFromMeta(p);
  if (poolMetaAddress) {
    return {
      poolAddress: poolMetaAddress,
      addressSource: "defillama:poolMeta",
      confidenceLevel: "medium",
      resolverNotes: null,
    };
  }

  if (!AVAX_RPC_URL) {
    return {
      poolAddress: null,
      addressSource: "unresolved",
      confidenceLevel: "low",
      resolverNotes: "rpc skipped: missing AVAX_RPC_URL",
    };
  }

  if (!configs || configs.length === 0) {
    return {
      poolAddress: null,
      addressSource: "unresolved",
      confidenceLevel: "low",
      resolverNotes: "rpc skipped: missing dex factories config",
    };
  }

  const tokenA = toAddress(p.underlyingTokens?.[0]);
  const tokenB = toAddress(p.underlyingTokens?.[1]);

  if (!tokenA || !tokenB) {
    return {
      poolAddress: null,
      addressSource: "unresolved",
      confidenceLevel: "low",
      resolverNotes: "rpc skipped: token addresses missing",
    };
  }

  const dexConfigs = matchDexConfigs(p.project || "", configs);
  if (!dexConfigs.length) {
    return {
      poolAddress: null,
      addressSource: "unresolved",
      confidenceLevel: "low",
      resolverNotes: "rpc skipped: dex factory not configured",
    };
  }

  const feeTiers = DEFAULT_V3_FEE_TIERS;
  for (const dexConfig of dexConfigs) {
    const type = safeLower(dexConfig.type || "");
    if (type === "traderjoe-lb" || type === "joe-lb") {
      return {
        poolAddress: null,
        addressSource: "unresolved",
        confidenceLevel: "low",
        resolverNotes: "lb pool needs binStep strategy (not implemented)",
      };
    }

    const resolved = await resolveViaFactory(
      provider,
      dexConfig,
      tokenA,
      tokenB,
      dexConfig.feeTiers || feeTiers,
    );
    if (resolved) {
      return {
        poolAddress: resolved,
        addressSource: "rpc:factory",
        confidenceLevel: "high",
        resolverNotes: null,
      };
    }
  }

  return {
    poolAddress: null,
    addressSource: "unresolved",
    confidenceLevel: "low",
    resolverNotes: "rpc resolved none",
  };
}

// ---- enrich ----

function normalize(p, resolverResult) {
  const [tokenA, tokenB] = p.symbol.split("-");
  const liquidityUsd = Number(p.tvlUsd || 0);
  const volume24hUsd = Number(p.volumeUsd1d || 0);
  const volume7dUsd = Number(p.volumeUsd7d || 0);

  const volatilityImpactPct =
    liquidityUsd > 0
      ? Math.min(100, (volume24hUsd / liquidityUsd) * 100)
      : 0;

  const tokenAddressA = toAddress(p.underlyingTokens?.[0]);
  const tokenAddressB = toAddress(p.underlyingTokens?.[1]);

  return {
    poolRef: p.pool,
    poolId: p.pool,
    poolAddress: resolverResult.poolAddress,
    addressSource: resolverResult.addressSource,
    resolverNotes: resolverResult.resolverNotes,
    confidenceLevel: resolverResult.confidenceLevel,

    entityType: "amm",
    dex: p.project,
    chain: p.chain,

    tokenAName: tokenA,
    tokenASymbol: tokenA,
    tokenBName: tokenB,
    tokenBSymbol: tokenB,

    tokenAddressA,
    tokenAddressB,
    tokenAAddress: tokenAddressA,
    tokenBAddress: tokenAddressB,

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

    protocolDependencies: p.rewardTokens?.length ? ["incentives"] : [],

    poolUpdatedAt: new Date().toISOString(),
    dataSource: "defillama",
  };
}

// ---- main ----

(async () => {
  try {
    log("INIT", "Starting TRAXR-AVAX fetch + resolve (single run)");

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const configs = loadFactoryConfig();
    if (!configs || configs.length === 0) {
      log("CONFIG", "No dex factory config found; RPC resolution will be skipped");
    }

    const provider =
      AVAX_RPC_URL && ethers ? new ethers.JsonRpcProvider(AVAX_RPC_URL) : null;

    const allPools = await fetchPools();
    log("FILTER", "Filtering Avalanche AMM pools");
    const ammPools = allPools.filter(isValidAmmPool);
    log("FILTER", "Valid AMM pools", ammPools.length);

    let resolvedMeta = 0;
    let resolvedRpc = 0;
    let unresolved = 0;
    const unresolvedDex = new Map();

    const enriched = [];

    for (const pool of ammPools) {
      const resolverResult = await resolvePoolAddress(pool, provider, configs);
      if (resolverResult.addressSource === "defillama:poolMeta") {
        resolvedMeta += 1;
      } else if (resolverResult.addressSource === "rpc:factory") {
        resolvedRpc += 1;
      } else {
        unresolved += 1;
        const key = pool.project || "unknown";
        unresolvedDex.set(key, (unresolvedDex.get(key) || 0) + 1);
      }

      enriched.push(normalize(pool, resolverResult));
      if (provider) {
        await sleep(25);
      }
    }

    const outFile = path.join(
      OUTPUT_DIR,
      `avaxPools_${timestampSlug()}.json`,
    );

    log("WRITE", "Writing snapshot", outFile);
    fs.writeFileSync(outFile, JSON.stringify(enriched, null, 2));

    log("SUMMARY", "Total fetched", allPools.length);
    log("SUMMARY", "Filtered AMM pools", ammPools.length);
    log("SUMMARY", "Resolved via poolMeta", resolvedMeta);
    log("SUMMARY", "Resolved via rpc", resolvedRpc);
    log("SUMMARY", "Unresolved", unresolved);

    const topUnresolved = [...unresolvedDex.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([dex, count]) => `${dex} (${count})`);

    log("SUMMARY", "Top unresolved DEXes", topUnresolved.join(", "));

    log("DONE", `Snapshot complete. Enriched pools saved: ${enriched.length}`);
  } catch (err) {
    log("ERROR", "Fetcher failed", err.message);
    console.error(err);
    process.exit(1);
  }
})();
