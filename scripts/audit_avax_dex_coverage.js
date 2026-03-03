const fs = require("fs");
const path = require("path");
const { JsonRpcProvider, Contract, Interface, getAddress } = require("ethers");

function loadDotEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    if (!key || process.env[key] != null) continue;
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnvLocal();

const RPC_URL = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const REGISTRY_PATH = path.join(__dirname, "..", "data", "avaxDexRegistry.json");
const FACTORIES_PATH = path.join(__dirname, "..", "data", "avaxDexFactories.json");
const LOOKBACK_BLOCKS = Number(process.env.TRAXR_AUDIT_LOOKBACK_BLOCKS || 100000);
const LOG_MAX_RANGE = Number(process.env.TRAXR_LOG_MAX_RANGE || 2000);
const OUTPUT_DIR = path.join(__dirname, "..", "data");

const V2_FACTORY_ABI = [
  "function allPairsLength() view returns (uint256)",
  "function allPairs(uint256) view returns (address)",
];
const LB_FACTORY_ABI = [
  "function getNumberOfLBPairs() view returns (uint256)",
  "function getLBPairAtIndex(uint256) view returns (address)",
];

const V3_FACTORY_IFACE = new Interface([
  "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
]);
const BALANCER_VAULT_IFACE = new Interface([
  "event PoolRegistered(bytes32 indexed poolId, address indexed poolAddress, uint8 specialization)",
]);

const SUPPORTED_ADAPTERS = new Set(["uniswap_v2", "uniswap_v3", "joe_lb", "balancer"]);

function normalizeAddressMaybe(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    return getAddress(value);
  } catch {
    return /^0x[a-fA-F0-9]{40}$/.test(value) ? value.toLowerCase() : null;
  }
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "").replace("Z", "Z");
}

function mergeConfigs() {
  const registryRaw = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const factoriesRaw = JSON.parse(fs.readFileSync(FACTORIES_PATH, "utf8"));

  const registry = Array.isArray(registryRaw) ? registryRaw : registryRaw.dexes || [];
  const factoryEntries = Array.isArray(factoriesRaw.dexFactories) ? factoriesRaw.dexFactories : [];
  const byDex = new Map(factoryEntries.map((d) => [d.dexId, d]));

  return registry.map((entry) => {
    const reg = typeof entry === "string" ? { dexId: entry } : entry;
    const f = byDex.get(reg.dexId);
    return {
      dexId: reg.dexId,
      configured: Boolean(f),
      enabled: Boolean(f && f.enabled),
      adapter: f?.adapter || null,
      protocolType: f?.protocolType || null,
      factoryAddress: normalizeAddressMaybe(f?.factoryAddress || null),
      deployBlock: f?.deployBlock ?? null,
      notes: f?.notes || null,
    };
  });
}

async function verifyDex(provider, latestBlock, dex) {
  const result = {
    ...dex,
    verifyStatus: "unknown",
    checks: {
      hasFactoryAddress: Boolean(dex.factoryAddress),
      hasContractCode: false,
      adapterSupported: SUPPORTED_ADAPTERS.has(dex.adapter),
      discoveryProbeOk: false,
      discoveredCountHint: null,
      samplePoolAddress: null,
      error: null,
    },
  };

  if (!dex.configured) {
    result.verifyStatus = "missing_config";
    return result;
  }
  if (!dex.enabled) {
    result.verifyStatus = "disabled";
    return result;
  }
  if (!dex.factoryAddress) {
    result.verifyStatus = "invalid_factory_address";
    return result;
  }

  try {
    const code = await provider.getCode(dex.factoryAddress);
    result.checks.hasContractCode = code && code !== "0x";
    if (!result.checks.hasContractCode) {
      result.verifyStatus = "no_contract_code";
      return result;
    }

    if (!result.checks.adapterSupported) {
      result.verifyStatus = "adapter_not_implemented";
      return result;
    }

    if (dex.adapter === "uniswap_v2") {
      const c = new Contract(dex.factoryAddress, V2_FACTORY_ABI, provider);
      const total = Number(await c.allPairsLength());
      result.checks.discoveredCountHint = total;
      if (total > 0) {
        result.checks.samplePoolAddress = await c.allPairs(total - 1);
      }
      result.checks.discoveryProbeOk = true;
      result.verifyStatus = "verified";
      return result;
    }

    if (dex.adapter === "uniswap_v3") {
      const topic = V3_FACTORY_IFACE.getEvent("PoolCreated").topicHash;
      const fromBlock = Math.max(Number(dex.deployBlock || 0), latestBlock - LOOKBACK_BLOCKS);
      const logs = [];
      for (let start = fromBlock; start <= latestBlock; start += LOG_MAX_RANGE + 1) {
        const end = Math.min(latestBlock, start + LOG_MAX_RANGE);
        const chunk = await provider.getLogs({
          address: dex.factoryAddress,
          topics: [topic],
          fromBlock: start,
          toBlock: end,
        });
        logs.push(...chunk);
      }
      result.checks.discoveredCountHint = logs.length;
      if (logs.length > 0) {
        const parsed = V3_FACTORY_IFACE.parseLog(logs[logs.length - 1]);
        result.checks.samplePoolAddress = parsed.args.pool;
      }
      result.checks.discoveryProbeOk = true;
      result.verifyStatus = "verified";
      return result;
    }

    if (dex.adapter === "joe_lb") {
      const c = new Contract(dex.factoryAddress, LB_FACTORY_ABI, provider);
      const total = Number(await c.getNumberOfLBPairs());
      result.checks.discoveredCountHint = total;
      if (total > 0) {
        result.checks.samplePoolAddress = await c.getLBPairAtIndex(total - 1);
      }
      result.checks.discoveryProbeOk = true;
      result.verifyStatus = "verified";
      return result;
    }

    if (dex.adapter === "balancer") {
      const topic = BALANCER_VAULT_IFACE.getEvent("PoolRegistered").topicHash;
      const fromBlock = Math.max(Number(dex.deployBlock || 0), latestBlock - LOOKBACK_BLOCKS);
      const logs = [];
      for (let start = fromBlock; start <= latestBlock; start += LOG_MAX_RANGE + 1) {
        const end = Math.min(latestBlock, start + LOG_MAX_RANGE);
        const chunk = await provider.getLogs({
          address: dex.factoryAddress,
          topics: [topic],
          fromBlock: start,
          toBlock: end,
        });
        logs.push(...chunk);
      }
      result.checks.discoveredCountHint = logs.length;
      if (logs.length > 0) {
        const parsed = BALANCER_VAULT_IFACE.parseLog(logs[logs.length - 1]);
        result.checks.samplePoolAddress = parsed.args.poolAddress;
      }
      result.checks.discoveryProbeOk = true;
      result.verifyStatus = "verified";
      return result;
    }

    result.verifyStatus = "adapter_not_implemented";
    return result;
  } catch (err) {
    result.verifyStatus = "verify_failed";
    result.checks.error = err?.message || String(err);
    return result;
  }
}

(async () => {
  const provider = new JsonRpcProvider(RPC_URL);
  const latestBlock = await provider.getBlockNumber();
  const merged = mergeConfigs();

  const results = [];
  for (const dex of merged) {
    results.push(await verifyDex(provider, latestBlock, dex));
  }

  const summary = {
    totalDexes: results.length,
    verified: results.filter((r) => r.verifyStatus === "verified").length,
    enabled: results.filter((r) => r.enabled).length,
    missingConfig: results.filter((r) => r.verifyStatus === "missing_config").length,
    disabled: results.filter((r) => r.verifyStatus === "disabled").length,
    notImplemented: results.filter((r) => r.verifyStatus === "adapter_not_implemented").length,
    failed: results.filter((r) => r.verifyStatus === "verify_failed").length,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outFile = path.join(OUTPUT_DIR, `avaxDexCoverage_${timestampSlug()}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ summary, results }, null, 2));

  console.log(JSON.stringify({ summary, outFile }, null, 2));
})();
