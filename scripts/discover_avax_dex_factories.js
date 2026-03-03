const fs = require("fs");
const path = require("path");
const { JsonRpcProvider, Contract } = require("ethers");

const BASE_URL = "https://api.geckoterminal.com/api/v2";
const NETWORK = "avax";
const FACTORIES_PATH = path.join(__dirname, "..", "data", "avaxDexFactories.json");
const RPC_URL = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const DELAY_MS = Number(process.env.TRAXR_FACTORY_DISCOVERY_DELAY_MS || 500);

const V2_LIKE_POOL_ABI = [
  "function factory() view returns (address)",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchFirstPool(dexId) {
  const url = `${BASE_URL}/networks/${NETWORK}/dexes/${dexId}/pools`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const first = Array.isArray(json?.data) ? json.data[0] : null;
  const id = first?.id;
  if (!id || typeof id !== "string" || !id.startsWith("avax_")) return null;
  const addr = id.replace("avax_", "");
  return /^0x[a-fA-F0-9]{40}$/.test(addr) ? addr : null;
}

async function tryReadFactory(provider, poolAddress) {
  try {
    const c = new Contract(poolAddress, V2_LIKE_POOL_ABI, provider);
    const f = await c.factory();
    if (typeof f === "string" && /^0x[a-fA-F0-9]{40}$/.test(f)) return f;
  } catch {}
  return null;
}

async function main() {
  if (!fs.existsSync(FACTORIES_PATH)) {
    throw new Error(`Missing ${FACTORIES_PATH}`);
  }

  const provider = new JsonRpcProvider(RPC_URL);
  const json = JSON.parse(fs.readFileSync(FACTORIES_PATH, "utf8"));
  const rows = Array.isArray(json.dexFactories) ? json.dexFactories : [];

  const candidates = rows.filter((r) =>
    r &&
    (r.protocolType === "uniswap_v2" || r.protocolType === "uniswap_v3") &&
    (!r.factoryAddress || r.factoryAddress === null),
  );

  const discovered = [];
  const failed = [];

  for (const row of candidates) {
    const pool = await fetchFirstPool(row.dexId);
    if (!pool) {
      failed.push({ dexId: row.dexId, reason: "no_pool" });
      await sleep(DELAY_MS);
      continue;
    }

    const factory = await tryReadFactory(provider, pool);
    if (!factory) {
      failed.push({ dexId: row.dexId, reason: "factory_call_failed", pool });
      await sleep(DELAY_MS);
      continue;
    }

    row.factoryAddress = factory;
    row.enabled = true;
    if (row.deployBlock == null) row.deployBlock = 0;
    discovered.push({ dexId: row.dexId, factoryAddress: factory, pool });
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(FACTORIES_PATH, JSON.stringify(json, null, 2));
  console.log(JSON.stringify({
    candidates: candidates.length,
    discovered: discovered.length,
    failed: failed.length,
    discoveredItems: discovered,
    failedItems: failed.slice(0, 30),
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
