const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "data");

function timestampSlug() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = now.getUTCFullYear();
  const mm = pad(now.getUTCMonth() + 1);
  const dd = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours());
  const min = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}Z`;
}

const pools = [
  {
    poolId: "avax-usdc-joe-v2",
    mintA: "AVAX",
    mintB: "USDC",
    poolAddress: "0x8e3d0f5a3a6c4b2f6c9e3dfe3d21f3b1b6f3c4a1",
    dex: "Trader Joe v2 (mock)",
    tokenAName: "Avalanche",
    tokenASymbol: "AVAX",
    tokenBName: "USD Coin",
    tokenBSymbol: "USDC",
    liquidityUsd: 12450000,
    volume24hUsd: 3210000,
    volume7dUsd: 18900000,
    tx24h: 842,
    tx7d: 5301,
    feePct: 0.003,
    volatilityPct: 0.9,
    priceImpactPct: 0.42,
    dataAgeHours: 0.5,
    liquidityDepthUsd: 12450000,
    liquidityConcentrationPct: 28,
    feeStabilityPct: 72,
    volatilityImpactPct: 0.6,
    contractIsProxy: false,
    contractIsUpgradeable: false,
    contractAdmin: null,
    contractOwner: null,
    contractHasTimelock: null,
    protocolDependencies: ["incentives"],
    poolUpdatedAt: new Date().toISOString(),
  },
];

(() => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputFile = path.join(
    OUTPUT_DIR,
    `avaxPools_${timestampSlug()}.json`,
  );
  fs.writeFileSync(outputFile, JSON.stringify(pools, null, 2));
  console.log(`[TRAXR-AVAX] Saved ${pools.length} pools -> ${outputFile}`);
  console.log("[TRAXR-AVAX] TODO: replace fixtures with live adapters.");
})();
