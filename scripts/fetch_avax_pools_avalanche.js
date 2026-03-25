/**
 * TRAXR-AVAX
 * Avalanche-native multi-DEX pool snapshot builder (modular adapter orchestrator)
 */

const fs = require("fs");
const path = require("path");
const { Contract, JsonRpcProvider, Interface, formatUnits, getAddress } = require("ethers");

const { loadDotEnvLocal } = require("./lib/env");
const { loadDexRuntimeConfigs } = require("./helpers/avaxDexConfig");
const {
  round,
  toNumber,
  safeDiv,
  confidenceFromPrices,
  choosePairIndices,
  timestampSlug,
} = require("./lib/math");
const { createRpcHelpers } = require("./lib/rpc");
const { createTokenMetaLoader } = require("./lib/token");
const { createPricingHelpers } = require("./lib/pricing");
const { createOutputHelpers } = require("./lib/output");
const { createActivityComputer } = require("./lib/activity");
const { loadFieldPolicy, applyPoolFieldPolicy } = require("./lib/fieldPolicy");
const { createContractRiskEnricher } = require("./lib/contractRisk");
const { ADAPTERS } = require("./adapters");

loadDotEnvLocal(path.join(__dirname, ".."));

const RPC_URL = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const OUTPUT_DIR = process.env.TRAXR_OUTPUT_DIR
  ? path.resolve(process.cwd(), process.env.TRAXR_OUTPUT_DIR)
  : path.join(__dirname, "..", "data", "test");
const REGISTRY_PATH = path.join(__dirname, "..", "data", "avaxDexRegistry.json");
const FACTORIES_PATH = path.join(__dirname, "..", "data", "avaxDexFactories.json");
const FIELD_POLICY_PATH = path.join(__dirname, "..", "data", "avaxFieldPolicy.json");

const config = {
  topPoolsPerDex: Number(process.env.TRAXR_MAX_POOLS_PER_DEX || 20),
  candidateMultiplier: Number(process.env.TRAXR_CANDIDATE_MULTIPLIER || 8),
  pairScanMode: (process.env.TRAXR_PAIR_SCAN_MODE || "spread").toLowerCase(),
  enable7dVolume: process.env.TRAXR_ENABLE_7D_VOLUME === "true",
  logMaxRange: Number(process.env.TRAXR_LOG_MAX_RANGE || 2000),
  blocksPerDay: Number(process.env.TRAXR_BLOCKS_PER_DAY || 43200),
  v3LookbackBlocks: Number(process.env.TRAXR_V3_LOOKBACK_BLOCKS || 300000),
  balancerLookbackBlocks: Number(process.env.TRAXR_BALANCER_LOOKBACK_BLOCKS || 500000),
  balancerMaxChunksPerRun: Number(process.env.TRAXR_BALANCER_MAX_CHUNKS_PER_RUN || 400),
  balancerCacheDir: process.env.TRAXR_BALANCER_CACHE_DIR
    ? path.resolve(process.cwd(), process.env.TRAXR_BALANCER_CACHE_DIR)
    : path.join(__dirname, "..", "data", "cache", "balancer"),
  v3FullHistory: process.env.TRAXR_V3_FULL_HISTORY !== "false",
  v3MaxChunksPerRun: Number(process.env.TRAXR_V3_MAX_CHUNKS_PER_RUN || 1500),
  v3CacheDir: process.env.TRAXR_V3_CACHE_DIR
    ? path.resolve(process.cwd(), process.env.TRAXR_V3_CACHE_DIR)
    : path.join(__dirname, "..", "data", "cache", "v3"),
  retryCount: Number(process.env.TRAXR_RPC_RETRY_COUNT || 3),
  retryDelayMs: Number(process.env.TRAXR_RPC_RETRY_DELAY_MS || 500),
  v2VolumeMode: (process.env.TRAXR_V2_VOLUME_MODE || "auto").toLowerCase(),
  minLiquidityUsd: Number(process.env.TRAXR_FILTER_MIN_LIQUIDITY_USD || 10000),
  require24hActivity: process.env.TRAXR_FILTER_REQUIRE_24H_ACTIVITY !== "false",
  enableOraclePriceSeed: process.env.TRAXR_ENABLE_ORACLE_PRICE_SEED !== "false",
  wavaxUsdOracle: process.env.TRAXR_WAVAX_USD_ORACLE
    || "0x0A77230d17318075983913bC2145DB16C7366156",
  targetTimestamp: process.env.TRAXR_TARGET_TIMESTAMP || "",
};

const CHAIN = "Avalanche";

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

const V2_FACTORY_ABI = [
  "function allPairsLength() view returns (uint256)",
  "function allPairs(uint256) view returns (address)",
  "function getPair(address,address) view returns (address)",
];
const V2_PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

const V3_POOL_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
];

const LB_FACTORY_ABI = [
  "function getNumberOfLBPairs() view returns (uint256)",
  "function getLBPairAtIndex(uint256) view returns (address)",
];
const LB_PAIR_ABI = [
  "function getTokenX() view returns (address)",
  "function getTokenY() view returns (address)",
  "function getReserves() view returns (uint128 reserveX, uint128 reserveY)",
  "function getBinStep() view returns (uint16)",
];
const BALANCER_VAULT_ABI = [
  "function getPoolTokens(bytes32 poolId) view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)",
];

const V2_SWAP_IFACE = new Interface([
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",
]);
const V3_SWAP_IFACE = new Interface([
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
]);
const LB_SWAP_IFACE = new Interface([
  "event Swap(address indexed sender, address indexed to, uint24 id, bytes32 amountsIn, bytes32 amountsOut, uint24 volatilityAccumulator, bytes32 totalFees, bytes32 protocolFees)",
]);
const BALANCER_SWAP_IFACE = new Interface([
  "event Swap(bytes32 indexed poolId, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)",
  "event PoolRegistered(bytes32 indexed poolId, address indexed poolAddress, uint8 specialization)",
]);
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const V3_FACTORY_IFACE = new Interface([
  "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
]);
const ORACLE_ABI = [
  "function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
];

const STABLE_PRICE_USD = {
  "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": 1,
  "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664": 1,
  "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7": 1,
  "0xc7198437980c041c805a1edcba50c1ce5db95118": 1,
  "0xd586e7f844cea2f87f50152665bcbc2c279d8d70": 1,
};

const constants = {
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
  SEED_TOKENS: [
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
    "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", // USDC.e
    "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDt
    "0xc7198437980c041c805A1EDcbA50c1Ce5db95118", // USDT.e
    "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", // DAI.e
    "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", // WETH.e
    "0x50b7545627a5162F82A992c33b87aDc75187B218", // WBTC.e
  ],
};

function log(step, msg, extra = "") {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [TRAXR-AVAX][${step}] ${msg}`, extra);
}

function normalizeAddressMaybe(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    return getAddress(value);
  } catch {
    return /^0x[a-fA-F0-9]{40}$/.test(value) ? value.toLowerCase() : null;
  }
}

function createHistoricalProvider(baseProvider, targetBlock) {
  return new Proxy(baseProvider, {
    get(target, prop, receiver) {
      if (prop === "call") {
        return (tx, blockTag) => target.call(tx, blockTag ?? targetBlock);
      }
      if (prop === "getStorage") {
        return (address, slot, blockTag) => target.getStorage(address, slot, blockTag ?? targetBlock);
      }
      if (prop === "getCode") {
        return (address, blockTag) => target.getCode(address, blockTag ?? targetBlock);
      }
      if (prop === "getBlockNumber") {
        return async () => targetBlock;
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

async function tryLoadOracleUsdPrice(provider, address, withRetry) {
  const normalized = normalizeAddressMaybe(address);
  if (!normalized) return null;
  try {
    const oracle = new Contract(normalized, ORACLE_ABI, provider);
    const [decimals, round] = await Promise.all([
      withRetry(() => oracle.decimals(), `oracle.decimals ${normalized}`),
      withRetry(() => oracle.latestRoundData(), `oracle.latestRoundData ${normalized}`),
    ]);
    if (!round || typeof round.answer !== "bigint" || round.answer <= 0n) return null;
    const dp = Number(decimals);
    if (!Number.isFinite(dp)) return null;
    const price = Number(round.answer) / 10 ** dp;
    if (!Number.isFinite(price) || price <= 0) return null;
    return price;
  } catch {
    return null;
  }
}

async function findBlockAtOrBeforeTimestamp(provider, latestBlock, targetTimestamp, withRetry) {
  if (targetTimestamp <= 0) return 0;

  const latest = await withRetry(() => provider.getBlock(latestBlock), `eth_getBlockByNumber ${latestBlock}`);
  if (!latest || typeof latest.timestamp !== "number") return Math.max(0, latestBlock - config.blocksPerDay);
  if (targetTimestamp >= latest.timestamp) return latestBlock;

  let low = 0;
  let high = latestBlock;
  let answer = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const block = await withRetry(() => provider.getBlock(mid), `eth_getBlockByNumber ${mid}`);
    const ts = block && typeof block.timestamp === "number" ? block.timestamp : null;
    if (ts == null) {
      if (mid === 0) break;
      high = mid - 1;
      continue;
    }

    if (ts <= targetTimestamp) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return answer;
}

async function discoverPoolsByDex(adapterCtx, dexConfigs, latestBlock) {
  const out = [];

  for (const dex of dexConfigs) {
    try {
      if (!dex.factoryAddress || dex.factoryAddress === constants.ZERO_ADDRESS) {
        log("WARN", `DEX ${dex.dexId} skipped`, "factoryAddress missing");
        continue;
      }

      const handler = ADAPTERS[dex.protocolType];
      if (!handler || typeof handler.discoverPools !== "function") {
        log("WARN", `DEX ${dex.dexId} unsupported protocolType`, dex.protocolType);
        continue;
      }

      const found = await handler.discoverPools(adapterCtx, dex, latestBlock);
      out.push(...found);
    } catch (err) {
      log("WARN", `DEX ${dex.dexId} discovery failed`, err?.message || String(err));
    }
  }

  const unique = new Map();
  for (const item of out) {
    const key = `${item.dexId}:${item.poolAddress.toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, item);
  }

  return [...unique.values()];
}

async function enrichPools(adapterCtx, discovered) {
  const tokenCache = new Map();
  const enriched = [];

  for (const pool of discovered) {
    try {
      const handler = ADAPTERS[pool.protocolType];
      if (!handler || typeof handler.enrichPool !== "function") {
        log("WARN", `Pool enrich unsupported protocol`, `${pool.dexId} ${pool.protocolType}`);
        continue;
      }
      enriched.push(await handler.enrichPool(adapterCtx, pool, tokenCache));
    } catch (err) {
      log("WARN", `Pool enrich failed ${pool.dexId} ${pool.poolAddress}`, err?.message || String(err));
    }
  }

  return enriched;
}

(async () => {
  try {
    log("INIT", "Starting Avalanche-native pool fetch", RPC_URL);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const provider = new JsonRpcProvider(RPC_URL);
    const { withRetry, getLogsChunked } = createRpcHelpers({
      retryCount: config.retryCount,
      retryDelayMs: config.retryDelayMs,
      log,
    });

    const getTokenMeta = createTokenMetaLoader({
      Contract,
      erc20Abi: ERC20_ABI,
      withRetry,
    });

    const pricing = createPricingHelpers({
      round,
      toNumber,
      formatUnits,
      v2VolumeMode: config.v2VolumeMode,
    });
    const output = createOutputHelpers({
      chain: CHAIN,
      round,
      safeDiv,
      confidenceFromPrices,
      outputDir: OUTPUT_DIR,
      log,
    });

    const computeActivity = createActivityComputer({
      blockPerDay: config.blocksPerDay,
      enable7d: config.enable7dVolume,
      logMaxRange: config.logMaxRange,
      getLogsChunked,
      withRetry,
      v2SwapIface: V2_SWAP_IFACE,
      v3SwapIface: V3_SWAP_IFACE,
      lbSwapIface: LB_SWAP_IFACE,
      balancerSwapIface: BALANCER_SWAP_IFACE,
      transferTopic: TRANSFER_TOPIC,
      pricing,
      toNumber,
      formatUnits,
      round,
    });

    const adapterCtx = {
      fs,
      path,
      provider,
      config,
      constants,
      log,
      Contract,
      formatUnits,
      withRetry,
      getLogsChunked,
      choosePairIndices,
      getTokenMeta,
      toNumber,
      erc20Abi: ERC20_ABI,
      v2FactoryAbi: V2_FACTORY_ABI,
      v2PairAbi: V2_PAIR_ABI,
      v3PoolAbi: V3_POOL_ABI,
      v3FactoryIface: V3_FACTORY_IFACE,
      lbFactoryAbi: LB_FACTORY_ABI,
      lbPairAbi: LB_PAIR_ABI,
      balancerVaultAbi: BALANCER_VAULT_ABI,
      balancerVaultIface: BALANCER_SWAP_IFACE,
    };

    const fieldPolicy = loadFieldPolicy(FIELD_POLICY_PATH);

    const {
      registry,
      runtime: dexConfigs,
      missing: missingDexConfigs,
    } = loadDexRuntimeConfigs(REGISTRY_PATH, FACTORIES_PATH, normalizeAddressMaybe);
    const dexById = new Map(dexConfigs.map((d) => [d.dexId, d]));

    const chainHeadBlock = await withRetry(() => provider.getBlockNumber(), "eth_blockNumber");
    const chainHeadBlockData = await withRetry(
      () => provider.getBlock(chainHeadBlock),
      `eth_getBlockByNumber ${chainHeadBlock}`,
    );
    let latestBlock = chainHeadBlock;
    let latestTs = chainHeadBlockData && typeof chainHeadBlockData.timestamp === "number"
      ? chainHeadBlockData.timestamp
      : Math.floor(Date.now() / 1000);
    if (config.targetTimestamp) {
      const targetMs = Date.parse(config.targetTimestamp);
      if (Number.isNaN(targetMs)) {
        throw new Error(`Invalid TRAXR_TARGET_TIMESTAMP: ${config.targetTimestamp}`);
      }
      latestBlock = await findBlockAtOrBeforeTimestamp(
        provider,
        chainHeadBlock,
        Math.floor(targetMs / 1000),
        withRetry,
      );
      const targetBlockData = await withRetry(
        () => provider.getBlock(latestBlock),
        `eth_getBlockByNumber ${latestBlock}`,
      );
      latestTs = targetBlockData && typeof targetBlockData.timestamp === "number"
        ? targetBlockData.timestamp
        : Math.floor(targetMs / 1000);
      adapterCtx.activeProvider = createHistoricalProvider(provider, latestBlock);
      log("CONFIG", "Historical target timestamp", config.targetTimestamp);
      log("CONFIG", "Historical target block", latestBlock);
    } else {
      adapterCtx.activeProvider = provider;
    }
    const enrichContractRisk = createContractRiskEnricher({
      provider: adapterCtx.activeProvider,
      Contract,
      withRetry,
      policy: fieldPolicy,
      log,
      abi: [
        "function owner() view returns (address)",
        "function getOwner() view returns (address)",
        "function admin() view returns (address)",
      ],
    });
    const from24 = await findBlockAtOrBeforeTimestamp(provider, latestBlock, latestTs - 24 * 60 * 60, withRetry);
    const from7d = config.enable7dVolume
      ? await findBlockAtOrBeforeTimestamp(provider, latestBlock, latestTs - 7 * 24 * 60 * 60, withRetry)
      : null;

    log("CONFIG", "Registry DEX count", registry.length);
    log("CONFIG", "Configured/enabled DEX count", dexConfigs.length);
    log("CONFIG", "Top pools per DEX", config.topPoolsPerDex);
    log("CONFIG", "V3 index mode", config.v3FullHistory ? "full-history-incremental" : "lookback");
    log("CONFIG", "Window blocks", `24h=${from24}->${latestBlock}${from7d != null ? `, 7d=${from7d}->${latestBlock}` : ""}`);
    if (missingDexConfigs.length) {
      log("WARN", "DEXes missing factory config", missingDexConfigs.slice(0, 12).join(", "));
    }

    const discovered = await discoverPoolsByDex(adapterCtx, dexConfigs, latestBlock);
    log("DISCOVER", "Total discovered pools", discovered.length);

    const enriched = await enrichPools(adapterCtx, discovered);
    log("ENRICH", "Pools enriched", enriched.length);

    const priceMap = pricing.seedPrices(STABLE_PRICE_USD);
    if (config.enableOraclePriceSeed && !config.targetTimestamp) {
      const wavaxAddress = constants.SEED_TOKENS[0].toLowerCase();
      if (!priceMap.has(wavaxAddress)) {
        const oraclePrice = await tryLoadOracleUsdPrice(
          provider,
          config.wavaxUsdOracle,
          withRetry,
        );
        if (oraclePrice != null) {
          priceMap.set(wavaxAddress, oraclePrice);
          log("PRICING", "Seeded WAVAX price from oracle", `${oraclePrice}`);
        } else {
          log("WARN", "WAVAX oracle seed unavailable", config.wavaxUsdOracle);
        }
      }
    }
    const anchored = pricing.deriveStableAnchoredPrices(enriched, priceMap);
    log("PRICING", "Seeded direct stable-pair prices", anchored);
    pricing.derivePrices(enriched, priceMap);

    const byDex = new Map();
    for (const pool of enriched) {
      const list = byDex.get(pool.dexId) || [];
      list.push({ pool, liquidityUsd: pricing.computeLiquidityUsd(pool, priceMap) });
      byDex.set(pool.dexId, list);
    }

    const selectedPools = [];
    for (const [dexId, items] of byDex.entries()) {
      const top = items
        .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
        .slice(0, config.topPoolsPerDex)
        .map((x) => x.pool);
      log("FILTER", `DEX ${dexId} selected pools`, top.length);
      selectedPools.push(...top);
    }

    const nowIso = config.targetTimestamp
      ? new Date(config.targetTimestamp).toISOString()
      : new Date().toISOString();
    const rows = [];
    const skipped = {
      lowLiquidity: 0,
      noActivity24h: 0,
    };

    for (const pool of selectedPools) {
      const dexConfig = dexById.get(pool.dexId) || null;
      const withPolicy = applyPoolFieldPolicy(pool, dexConfig, fieldPolicy);
      const withRisk = await enrichContractRisk(withPolicy);
      const liquidityUsd = pricing.computeLiquidityUsd(withRisk, priceMap);
      const activity = await computeActivity(
        provider,
        withRisk,
        latestBlock,
        priceMap,
        { from24, from7d },
      );
      if (activity.error) {
        log("WARN", `Activity fallback ${withRisk.dexId} ${withRisk.poolAddress}`, activity.error);
      }
      const row = output.normalizeRow(withRisk, activity, priceMap, liquidityUsd, nowIso);
      if ((row.liquidityUsd || 0) < config.minLiquidityUsd) {
        skipped.lowLiquidity += 1;
        continue;
      }
      if (config.require24hActivity && ((row.tx24h || 0) <= 0 || (row.volume24hUsd || 0) <= 0)) {
        skipped.noActivity24h += 1;
        continue;
      }
      rows.push(row);
    }

    output.applyLiquidityConcentration(rows);

    const outFile = path.join(OUTPUT_DIR, `avaxPools_avaxrpc_${timestampSlug()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));

    output.compareVsGecko(rows);

    const totalLiquidity = rows.reduce((acc, r) => acc + (r.liquidityUsd || 0), 0);
    const total24hVolume = rows.reduce((acc, r) => acc + (r.volume24hUsd || 0), 0);

    log("SUMMARY", "Pools/TVL/24hVol", `${rows.length} / ${round(totalLiquidity, 2)} / ${round(total24hVolume, 2)}`);
    log(
      "SUMMARY",
      "Skipped pools",
      `lowLiquidity=${skipped.lowLiquidity}, no24hActivity=${skipped.noActivity24h}`,
    );
    log("DONE", "Snapshot written", outFile);
  } catch (err) {
    log("ERROR", "Fetcher failed", err?.message || String(err));
    console.error(err);
    process.exit(1);
  }
})();
