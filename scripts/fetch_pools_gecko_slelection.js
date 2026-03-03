/**
 * TRAXR-AVAX
 * GeckoTerminal selected-DEX fetcher for native-validation loops.
 *
 * DEX selection source: data/avaxDexFactories.json (enabled=true)
 * Output: data/test/avaxPools_gecko_selection_<timestamp>.json
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "https://api.geckoterminal.com/api/v2";
const NETWORK = "avax";
const FACTORIES_PATH = path.join(__dirname, "..", "data", "avaxDexFactories.json");
const OUTPUT_DIR = process.env.TRAXR_OUTPUT_DIR
  ? path.resolve(process.cwd(), process.env.TRAXR_OUTPUT_DIR)
  : path.join(__dirname, "..", "data", "test");

const MAX_DEX = Number(process.env.TRAXR_GECKO_SELECTION_MAX_DEX || 0);
const DEX_DELAY_MS = Number(process.env.TRAXR_GECKO_SELECTION_DEX_DELAY_MS || 2000);

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

function parseFeeFromName(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? num(m[1]) : null;
}

function defaultFeeByDex(dexId) {
  const v2Like = [
    "pangolin",
    "traderjoe",
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

  return v2Like.includes(dexId) ? 0.3 : null;
}

function bestEffortFee(attrs, dexId, tokenA, tokenB) {
  return (
    num(attrs.fee_percentage) ??
    num(attrs.fee_percent) ??
    num(attrs.swap_fee) ??
    parseFeeFromName(tokenA?.name) ??
    parseFeeFromName(tokenA?.symbol) ??
    parseFeeFromName(tokenB?.name) ??
    parseFeeFromName(tokenB?.symbol) ??
    defaultFeeByDex(dexId)
  );
}

function loadSelectedDexes() {
  if (!fs.existsSync(FACTORIES_PATH)) {
    throw new Error(`Missing ${FACTORIES_PATH}`);
  }

  const json = JSON.parse(fs.readFileSync(FACTORIES_PATH, "utf8"));
  const rows = Array.isArray(json.dexFactories) ? json.dexFactories : [];

  let dexes = rows
    .filter((d) => d && d.enabled === true && typeof d.dexId === "string")
    .map((d) => d.dexId);

  if (MAX_DEX > 0) dexes = dexes.slice(0, MAX_DEX);

  return dexes;
}

async function fetchDexPools(dexId) {
  let url = `${BASE_URL}/networks/${NETWORK}/dexes/${dexId}/pools?include=base_token,quote_token`;
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

    await sleep(350);
  }

  return { pools, included };
}

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
    poolAddress: p.id.replace("avax_", ""),

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

(async () => {
  try {
    const dexes = loadSelectedDexes();
    log("INIT", "Starting Gecko selection fetch", `selectedDEX=${dexes.length}`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const allPools = [];
    const seen = new Set();

    for (const dexId of dexes) {
      const { pools, included } = await fetchDexPools(dexId);
      const tokenMap = buildTokenMap(included);

      log("FETCH", `DEX ${dexId} pools fetched`, pools.length);

      for (const p of pools) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        allPools.push(normalizePool(p, dexId, tokenMap));
      }

      if (DEX_DELAY_MS > 0) await sleep(DEX_DELAY_MS);
    }

    const outFile = path.join(
      OUTPUT_DIR,
      `avaxPools_gecko_selection_${timestampSlug()}.json`,
    );

    log("WRITE", "Writing selection snapshot", outFile);
    fs.writeFileSync(outFile, JSON.stringify(allPools, null, 2));

    log("DONE", `Total unique pools saved: ${allPools.length}`);
  } catch (err) {
    log("ERROR", "Fetcher failed", err?.message || String(err));
    console.error(err);
    process.exit(1);
  }
})();
