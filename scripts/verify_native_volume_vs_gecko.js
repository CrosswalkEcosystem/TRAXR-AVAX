const fs = require("fs");
const path = require("path");
const { JsonRpcProvider, Interface, formatUnits } = require("ethers");

const RPC_URL = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const DATA_DIR = path.join(__dirname, "..", "data", "test");
const LOG_MAX_RANGE = Number(process.env.TRAXR_LOG_MAX_RANGE || 2000);

const STABLES = new Set([
  "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
  "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
  "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
  "0xc7198437980c041c805a1edcba50c1ce5db95118",
  "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
]);

const V2_SWAP_IFACE = new Interface([
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",
]);
const V2_SWAP_TOPIC = V2_SWAP_IFACE.getEvent("Swap").topicHash;

function latestFile(prefix) {
  const files = fs.readdirSync(DATA_DIR).filter((x) => x.startsWith(prefix)).sort();
  if (!files.length) throw new Error(`No file for prefix ${prefix}`);
  return path.join(DATA_DIR, files[files.length - 1]);
}

function isV2Pool(row) {
  return String(row.addressSource || "").includes("uniswap_v2");
}

function asNumber(raw, decimals) {
  try {
    return Number(formatUnits(raw, decimals));
  } catch {
    return 0;
  }
}

async function findBlockAtOrBeforeTimestamp(provider, latestBlock, targetTs) {
  let lo = 0;
  let hi = latestBlock;
  let ans = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const block = await provider.getBlock(mid);
    const ts = block && typeof block.timestamp === "number" ? block.timestamp : null;
    if (ts == null) {
      hi = mid - 1;
      continue;
    }
    if (ts <= targetTs) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

async function getLogsChunked(provider, filter, step) {
  const out = [];
  for (let from = Number(filter.fromBlock); from <= Number(filter.toBlock); from += step) {
    const to = Math.min(Number(filter.toBlock), from + step - 1);
    const rows = await provider.getLogs({
      ...filter,
      fromBlock: from,
      toBlock: to,
    });
    out.push(...rows);
  }
  return out;
}

async function main() {
  const nativeFile = latestFile("avaxPools_avaxrpc_");
  const geckoFile = latestFile("avaxPools_gecko_selection_");
  const native = JSON.parse(fs.readFileSync(nativeFile, "utf8"));
  const gecko = JSON.parse(fs.readFileSync(geckoFile, "utf8"));
  const geckoByPool = new Map(gecko.map((x) => [String(x.poolAddress || "").toLowerCase(), x]));

  const v2StableOverlap = native.filter((n) => {
    if (!isV2Pool(n)) return false;
    if (!geckoByPool.has(String(n.poolAddress || "").toLowerCase())) return false;
    const a = String(n.tokenAAddress || "").toLowerCase();
    const b = String(n.tokenBAddress || "").toLowerCase();
    return STABLES.has(a) || STABLES.has(b);
  });

  const provider = new JsonRpcProvider(RPC_URL);
  const latest = await provider.getBlockNumber();
  const latestBlock = await provider.getBlock(latest);
  const targetTs = latestBlock.timestamp - 24 * 60 * 60;
  const from24 = await findBlockAtOrBeforeTimestamp(provider, latest, targetTs);

  const report = [];

  for (const row of v2StableOverlap) {
    const poolAddress = String(row.poolAddress || "").toLowerCase();
    const g = geckoByPool.get(poolAddress);

    const tokenA = String(row.tokenAAddress || "").toLowerCase();
    const tokenB = String(row.tokenBAddress || "").toLowerCase();
    const stableIsA = STABLES.has(tokenA);
    const stableIsB = STABLES.has(tokenB);
    const stableDecimals = stableIsA ? Number(row.tokenADecimals || 18) : Number(row.tokenBDecimals || 18);

    const logs = await getLogsChunked(provider, {
      address: poolAddress,
      topics: [V2_SWAP_TOPIC],
      fromBlock: from24,
      toBlock: latest,
    }, LOG_MAX_RANGE);

    let stableMaxUsd = 0;
    let stableSumUsd = 0;
    let tx = 0;
    for (const item of logs) {
      try {
        const parsed = V2_SWAP_IFACE.parseLog(item);
        tx += 1;
        const stableInRaw = stableIsA ? parsed.args.amount0In : parsed.args.amount1In;
        const stableOutRaw = stableIsA ? parsed.args.amount0Out : parsed.args.amount1Out;
        const stableIn = asNumber(stableInRaw, stableDecimals);
        const stableOut = asNumber(stableOutRaw, stableDecimals);
        stableMaxUsd += Math.max(stableIn, stableOut);
        stableSumUsd += stableIn + stableOut;
      } catch {}
    }

    report.push({
      dex: row.dex,
      poolAddress,
      pair: `${row.tokenASymbol}/${row.tokenBSymbol}`,
      tx24hLogs: tx,
      geckoVolume24hUsd: Number(g?.volume24hUsd || 0),
      nativeVolume24hUsd: Number(row.volume24hUsd || 0),
      stableSideMaxUsd: stableMaxUsd,
      stableSideSumUsd: stableSumUsd,
      geckoVsStableMaxDiffPct: stableMaxUsd > 0
        ? ((Number(g?.volume24hUsd || 0) - stableMaxUsd) / stableMaxUsd) * 100
        : null,
      nativeVsStableMaxDiffPct: stableMaxUsd > 0
        ? ((Number(row.volume24hUsd || 0) - stableMaxUsd) / stableMaxUsd) * 100
        : null,
    });
  }

  report.sort((a, b) => Math.abs(b.geckoVsStableMaxDiffPct || 0) - Math.abs(a.geckoVsStableMaxDiffPct || 0));
  console.log(JSON.stringify({
    nativeFile: path.basename(nativeFile),
    geckoFile: path.basename(geckoFile),
    from24Block: from24,
    latestBlock: latest,
    poolsChecked: report.length,
    report,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
