/**
 * TRAXR-AVAX
 * GeckoTerminal per-DEX AMM pool indexer (FREE, NO RPC)
 *
 * - Fetches pools per DEX (cursor pagination)
 * - Resolves token metadata (name, symbol, address, decimals)
 * - Best-effort fee detection (direct → name → dex default)
 * - Deduplicates by poolAddress
 * - Outputs ONE JSON snapshot with ALL pools
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "https://api.geckoterminal.com/api/v2";
const NETWORK = "avax";
const OUTPUT_DIR = path.join(__dirname, "..", "data");

// ---------------- DEX LIST ----------------

const DEX_IDS = [
  "pangolin",
  "traderjoe",
  "lydia_finance",
  "thorus",
  "firebird_avax",
  "elk_finance_avax",
  "yetiswap",
  "sushiswap_avalanche",
  "hakuswap",
  "radioshack_avalanche",
  "hurricaneswap",
  "apexswap",
  "swapsicle",
  "fraxswap_avalanche",
  "spice_trade_avalanche",
  "kyberswap_elastic_avalanche",
  "baguette",
  "soulswap_avalanche",
  "kyberswap_classic_avalanche",
  "traderjoe-v2-avalanche",
  "onavax",
  "curve_avalanche",
  "vapordex",
  "hunnyswap",
  "flair-dex",
  "glacier",
  "solisnek",
  "traderjoe-v2-1-avalanche",
  "sushiswap-v3-avalanche",
  "uniswap-v3-avalanche",
  "balancer-v2-avalanche",
  "dex-on-crypto-avalanche",
  "canary-exchange",
  "pharaoh-exchange",
  "vapordex-v2",
  "antfarm-avalanche",
  "archly-avalanche",
  "uniswap-v2-avalanche",
  "pharaoh-exchange-v1",
  "pyreswap-avalanche",
  "traderjoe-v2-2-avalanche",
  "fwx",
  "uniswap-v4-avalanche",
  "aquaspace",
  "arena-dex",
  "pangolin-v3",
  "blackhole-v2",
  "blackhole-v3",
  "omni-exchange-v2-avalanche",
  "omni-exchange-v3-avalanche",
  "balancer-v3-avalanche",
  "omni-exchange-v4-avalanche",
  "pharaoh-exchange-v3",
  "pharaoh-exchange-legacy",
  "aquaspace-v3",
];

// ---------------- utils ----------------

function log(step, msg, extra = "") {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [TRAXR-AVAX][${step}] ${msg}`, extra);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "").replace("Z", "Z");
}

// ---------------- fee helpers ----------------

function parseFeeFromName(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? num(m[1]) : null;
}

function defaultFeeByDex(dexId) {
  const d = dexId.toLowerCase();

  const v2Like = [
    "pangolin",
    "traderjoe",
    "traderjoe-v2-avalanche",
    "uniswap-v2-avalanche",
    "sushiswap_avalanche",
    "lydia_finance",
    "yetiswap",
    "elk_finance_avax",
    "hakuswap",
    "radioshack_avalanche",
    "hurricaneswap",
    "apexswap",
    "swapsicle",
    "baguette",
    "soulswap_avalanche",
    "pyreswap-avalanche",
    "thorus",
    "vapordex",
    "vapordex-v2",
    "hunnyswap",
    "flair-dex",
    "solisnek",
    "canary-exchange",
  ];

  if (v2Like.includes(d)) return 0.3;
  return null; // V3 / elastic / LB → unknown without deeper resolver
}

function bestEffortFee(attrs, dexId, tokenA, tokenB) {
  const direct =
    num(attrs.fee_percentage) ??
    num(attrs.fee_percent) ??
    num(attrs.swap_fee) ??
    null;

  if (direct != null) return direct;

  const fromName =
    parseFeeFromName(tokenA?.name) ??
    parseFeeFromName(tokenA?.symbol) ??
    parseFeeFromName(tokenB?.name) ??
    parseFeeFromName(tokenB?.symbol);

  if (fromName != null) return fromName;

  return defaultFeeByDex(dexId);
}

// ---------------- fetch ----------------

async function fetchDexPools(dexId) {
  let url = `${BASE_URL}/networks/${NETWORK}/dexes/${dexId}/pools`;
  const pools = [];
  const included = [];

  while (url) {
    log("FETCH", `DEX ${dexId}`, url);

    const res = await fetch(url);
    if (res.status === 429) {
      log("WARN", "429 rate-limit, sleeping 3s");
      await sleep(3000);
      continue;
    }
    if (!res.ok) break;

    const json = await res.json();
    pools.push(...(json.data || []));
    included.push(...(json.included || []));
    url = json.links?.next || null;

    await sleep(250);
  }

  return { pools, included };
}

// ---------------- normalize ----------------

function buildTokenMap(included) {
  const map = new Map();

  for (const i of included) {
    if (i.type !== "token") continue;

    map.set(i.id, {
      address: i.attributes?.address ?? null,
      name: i.attributes?.name ?? null,
      symbol: i.attributes?.symbol ?? null,
      decimals: i.attributes?.decimals ?? null,
    });
  }

  return map;
}

function normalizePool(p, dexId, tokenMap) {
  const attrs = p.attributes || {};

  const baseId = p.relationships?.base_token?.data?.id;
  const quoteId = p.relationships?.quote_token?.data?.id;

  const tokenA = tokenMap.get(baseId) || {};
  const tokenB = tokenMap.get(quoteId) || {};

  const liquidityUsd = num(attrs.reserve_in_usd) ?? 0;
  const volume24hUsd = num(attrs.volume_usd?.h24) ?? 0;
  const volume7dUsd = num(attrs.volume_usd?.d7) ?? 0;

  return {
    poolRef: p.id,
    poolId: p.id,
    poolAddress: p.id.startsWith("avax_") ? p.id.replace("avax_", "") : p.id,

    addressSource: "geckoterminal",
    confidenceLevel: "high",

    entityType: "amm",
    dex: dexId,
    chain: "Avalanche",

    tokenAName: tokenA.name,
    tokenASymbol: tokenA.symbol,
    tokenAAddress: tokenA.address,
    tokenADecimals: tokenA.decimals,

    tokenBName: tokenB.name,
    tokenBSymbol: tokenB.symbol,
    tokenBAddress: tokenB.address,
    tokenBDecimals: tokenB.decimals,

    liquidityUsd,
    volume24hUsd,
    volume7dUsd,

    tx24h: num(attrs.transactions?.h24),
    tx7d: num(attrs.transactions?.d7),

    feePct: bestEffortFee(attrs, dexId, tokenA, tokenB),

    liquidityDepthUsd: liquidityUsd,
    volatilityImpactPct:
      liquidityUsd > 0 ? Math.min(100, (volume24hUsd / liquidityUsd) * 100) : 0,

    liquidityConcentrationPct: null,
    feeStabilityPct: null,

    contractIsProxy: null,
    contractIsUpgradeable: null,
    contractAdmin: null,
    contractOwner: null,
    contractHasTimelock: null,

    protocolDependencies: [],

    poolUpdatedAt: new Date().toISOString(),
    dataSource: "geckoterminal",
  };
}

// ---------------- main ----------------

(async () => {
  try {
    log("INIT", "Starting GeckoTerminal AVAX SAFE full pool fetch");

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const allPools = [];
    const seen = new Set();

    for (const dexId of DEX_IDS) {
      const { pools, included } = await fetchDexPools(dexId);
      const tokenMap = buildTokenMap(included);

      log("FETCH", `DEX ${dexId} pools fetched`, pools.length);

      for (const p of pools) {
        const addr = p.id;
        if (seen.has(addr)) continue;
        seen.add(addr);

        allPools.push(normalizePool(p, dexId, tokenMap));
      }

      await sleep(1000); // extra politeness between DEXes
    }

    const outFile = path.join(
      OUTPUT_DIR,
      `avaxPools_gecko_${timestampSlug()}.json`
    );

    log("WRITE", "Writing snapshot", outFile);
    fs.writeFileSync(outFile, JSON.stringify(allPools, null, 2));

    log("DONE", `Total unique pools saved: ${allPools.length}`);
  } catch (err) {
    log("ERROR", "Fetcher failed", err.message);
    console.error(err);
    process.exit(1);
  }
})();
