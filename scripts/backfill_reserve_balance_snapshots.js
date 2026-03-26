const fs = require("fs");
const path = require("path");
const { Contract, JsonRpcProvider, formatUnits, getAddress } = require("ethers");

const { createRpcHelpers } = require("./lib/rpc");
const { createAsyncHelpers } = require("./lib/async");
const { createTokenMetaLoader } = require("./lib/token");
const { createPricingHelpers } = require("./lib/pricing");
const { round, toNumber } = require("./lib/math");
const { ADAPTERS } = require("./adapters");

const RPC_URL = process.env.AVAX_RPC_URL || "https://avalanche-c-chain-rpc.publicnode.com";

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

const PRICE_ANCHOR_TOKENS = [
  "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
  "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", // USDC.e
  "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDt
  "0xc7198437980c041c805A1EDcbA50c1Ce5db95118", // USDT.e
  "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", // DAI.e
].map((value) => value.toLowerCase());

const ORACLE_PRICE_SEEDS = [
  {
    token: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
    oracleEnv: "TRAXR_WAVAX_USD_ORACLE",
    oracle: "0x0A77230d17318075983913bC2145DB16C7366156",
    label: "WAVAX",
  },
  {
    token: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", // WETH.e
    oracleEnv: "TRAXR_WETH_USD_ORACLE",
    oracle: "0x976B3D034E162d8bD72D6b9C989d545b839003b0",
    label: "WETH.e",
  },
  {
    token: "0x50b7545627a5162F82A992c33b87aDc75187B218", // WBTC.e
    oracleEnv: "TRAXR_WBTC_USD_ORACLE",
    oracle: "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743",
    label: "WBTC.e",
  },
];

function log(step, msg, extra = "") {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [BACKFILL][${step}] ${msg}`, extra);
}

function parseSnapshotTimestampFromFilename(filePath) {
  const name = path.basename(filePath);
  const match = name.match(/avaxPools_avaxrpc_(\d{4}-\d{2}-\d{2}T\d{6}\d{3}Z)\.json$/i);
  if (!match) return null;
  const raw = match[1];
  const iso =
    `${raw.slice(0, 4)}-${raw.slice(5, 7)}-${raw.slice(8, 10)}` +
    `T${raw.slice(11, 13)}:${raw.slice(13, 15)}:${raw.slice(15, 17)}.${raw.slice(17, 20)}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
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

async function findBlockAtOrBeforeTimestamp(provider, latestBlock, targetTimestamp, withRetry) {
  if (targetTimestamp <= 0) return 0;
  const latest = await withRetry(() => provider.getBlock(latestBlock), `eth_getBlockByNumber ${latestBlock}`);
  if (!latest || typeof latest.timestamp !== "number") return latestBlock;
  if (targetTimestamp >= latest.timestamp) return latestBlock;

  let low = 0;
  let high = latestBlock;
  let answer = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const block = await withRetry(() => provider.getBlock(mid), `eth_getBlockByNumber ${mid}`);
    const ts = block && typeof block.timestamp === "number" ? block.timestamp : null;
    if (ts == null) {
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

function protocolTypeFromAddressSource(source) {
  const suffix = String(source || "").split(":")[1] || "";
  return suffix.toLowerCase();
}

function computeReserveBalancePct(pool, priceMap) {
  if (Array.isArray(pool.tokens) && pool.tokens.length) {
    const usdParts = pool.tokens
      .map((token) => {
        const price = priceMap.get(String(token.address || "").toLowerCase());
        const amount = Number(token.amount || 0);
        if (!Number.isFinite(price) || price == null || price <= 0) return null;
        if (!Number.isFinite(amount) || amount <= 0) return null;
        return amount * price;
      })
      .filter((value) => Number.isFinite(value) && value > 0);

    if (usdParts.length < 2) return null;
    const totalUsd = usdParts.reduce((sum, value) => sum + value, 0);
    const largestUsd = Math.max(...usdParts);
    const restUsd = totalUsd - largestUsd;
    if (!(largestUsd > 0) || !(restUsd > 0)) return 0;
    return round(100 * Math.min(largestUsd, restUsd) / Math.max(largestUsd, restUsd), 6);
  }

  const p0 = priceMap.get(pool.token0.address.toLowerCase()) || null;
  const p1 = priceMap.get(pool.token1.address.toLowerCase()) || null;
  if (p0 == null || p1 == null) return null;

  const usd0 = (Number(pool.amount0) || 0) * p0;
  const usd1 = (Number(pool.amount1) || 0) * p1;
  if (!(usd0 > 0) || !(usd1 > 0)) return 0;
  return round(100 * Math.min(usd0, usd1) / Math.max(usd0, usd1), 6);
}

async function tryLoadOracleUsdPrice(provider, address, withRetry) {
  try {
    const oracle = new Contract(address, ORACLE_ABI, provider);
    const [decimals, roundData] = await Promise.all([
      withRetry(() => oracle.decimals(), `oracle.decimals ${address}`),
      withRetry(() => oracle.latestRoundData(), `oracle.latestRoundData ${address}`),
    ]);
    if (!roundData || typeof roundData.answer !== "bigint" || roundData.answer <= 0n) return null;
    const dp = Number(decimals);
    if (!Number.isFinite(dp)) return null;
    const price = Number(roundData.answer) / 10 ** dp;
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

async function backfillFile(filePath, shared) {
  const timestampIso = parseSnapshotTimestampFromFilename(filePath);
  if (!timestampIso) {
    throw new Error(`Could not parse snapshot timestamp from ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`Snapshot is not an array: ${filePath}`);

  const targetMs = Date.parse(timestampIso);
  const latestChainBlock = await shared.withRetry(() => shared.provider.getBlockNumber(), "eth_blockNumber");
  const targetBlock = await findBlockAtOrBeforeTimestamp(
    shared.provider,
    latestChainBlock,
    Math.floor(targetMs / 1000),
    shared.withRetry,
  );
  const historicalProvider = createHistoricalProvider(shared.provider, targetBlock);

  const adapterCtx = {
    Contract,
    provider: shared.provider,
    activeProvider: historicalProvider,
    withRetry: shared.withRetry,
    getTokenMeta: shared.getTokenMeta,
    toNumber,
    formatUnits,
    mapWithConcurrency: shared.mapWithConcurrency,
    config: {
      discoverRpcConcurrency: 3,
      logMaxRange: 2000,
    },
    constants: {
      ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
    },
    erc20Abi: ERC20_ABI,
    v2FactoryAbi: V2_FACTORY_ABI,
    v2PairAbi: V2_PAIR_ABI,
    v3PoolAbi: V3_POOL_ABI,
    lbFactoryAbi: LB_FACTORY_ABI,
    lbPairAbi: LB_PAIR_ABI,
    balancerVaultAbi: BALANCER_VAULT_ABI,
    log,
  };

  const tokenCache = new Map();
  const enrichableRows = raw.filter((row) => protocolTypeFromAddressSource(row.addressSource) !== "balancer");
  const enriched = await shared.mapWithConcurrency(
    enrichableRows,
    4,
    async (row) => {
      const protocolType = protocolTypeFromAddressSource(row.addressSource);
      const handler = ADAPTERS[protocolType];
      if (!handler || typeof handler.enrichPool !== "function") {
        return { row, enrichedPool: null, reason: `unsupported protocol ${protocolType}` };
      }

      try {
        const basePool = {
          dexId: row.dex,
          protocolType,
          poolAddress: getAddress(row.poolAddress),
          feePct: typeof row.feePct === "number" ? row.feePct : null,
        };
        const enrichedPool = await handler.enrichPool(adapterCtx, basePool, tokenCache, { includeMetadata: false });
        return { row, enrichedPool, reason: null };
      } catch (err) {
        return { row, enrichedPool: null, reason: err?.message || String(err) };
      }
    },
  );

  const pricedPools = enriched
    .map((item) => item.enrichedPool)
    .filter(Boolean);

  const priceMap = shared.pricing.seedPrices(STABLE_PRICE_USD);
  const anchorTokens = new Set(PRICE_ANCHOR_TOKENS);
  for (const seed of ORACLE_PRICE_SEEDS) {
    const tokenAddress = seed.token.toLowerCase();
    if (priceMap.has(tokenAddress)) continue;
    const oracleAddress = process.env[seed.oracleEnv] || seed.oracle;
    const oraclePrice = await tryLoadOracleUsdPrice(historicalProvider, oracleAddress, shared.withRetry);
    if (oraclePrice != null) {
      priceMap.set(tokenAddress, oraclePrice);
      log("PRICING", `Seeded historical ${seed.label} price from oracle`, `${oraclePrice}`);
    } else {
      log("WARN", `Historical ${seed.label} oracle seed unavailable`, oracleAddress);
    }
  }
  shared.pricing.deriveStableAnchoredPrices(pricedPools, priceMap);
  shared.pricing.derivePrices(pricedPools, priceMap, {
    anchorTokens,
    minKnownSideUsdWeight: 10000,
    maxPasses: 1,
  });

  let updated = 0;
  let skipped = 0;

  for (const item of enriched) {
    if (!item.enrichedPool) {
      skipped += 1;
      continue;
    }
    const reserveBalancePct = computeReserveBalancePct(item.enrichedPool, priceMap);
    const row = item.row;
    row.reserveBalancePct = typeof reserveBalancePct === "number" ? reserveBalancePct : null;
    row.liquidityConcentrationPct =
      typeof reserveBalancePct === "number"
        ? round(Math.max(0, 100 - reserveBalancePct), 6)
        : null;
    updated += 1;
  }

  for (const row of raw) {
    if (protocolTypeFromAddressSource(row.addressSource) === "balancer") {
      row.reserveBalancePct = row.reserveBalancePct ?? null;
      row.liquidityConcentrationPct = row.liquidityConcentrationPct ?? null;
      skipped += 1;
    }
  }

  const backupPath = `${filePath}.bak`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }
  fs.writeFileSync(filePath, JSON.stringify(raw, null, 2));

  log("DONE", path.basename(filePath), `block=${targetBlock} updated=${updated} skipped=${skipped} backup=${path.basename(backupPath)}`);
}

async function main() {
  const files = process.argv.slice(2);
  const targetFiles = files.length
    ? files.map((file) => path.resolve(process.cwd(), file))
    : [
        path.join(process.cwd(), "data", "avaxPools_avaxrpc_2026-03-25T121809984Z.json"),
        path.join(process.cwd(), "data", "avaxPools_avaxrpc_2026-03-26T044942365Z.json"),
      ];

  const provider = new JsonRpcProvider(RPC_URL);
  const { mapWithConcurrency } = createAsyncHelpers();
  const { withRetry } = createRpcHelpers({
    retryCount: 3,
    retryDelayMs: 500,
    log,
    mapWithConcurrency,
    logChunkConcurrency: 2,
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
    v2VolumeMode: "auto",
  });

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    log("INIT", "Backfilling snapshot", filePath);
    await backfillFile(filePath, {
      provider,
      withRetry,
      mapWithConcurrency,
      getTokenMeta,
      pricing,
    });
  }
}

main().catch((err) => {
  log("ERROR", "Backfill failed", err?.message || String(err));
  console.error(err);
  process.exit(1);
});
