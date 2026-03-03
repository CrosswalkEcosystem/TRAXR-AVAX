const fs = require("fs");
const path = require("path");

function createOutputHelpers({ chain, round, safeDiv, confidenceFromPrices, outputDir, log }) {
  function normalizeRow(pool, activity, priceMap, liquidityUsd, nowIso) {
    const token0Price = priceMap.get(pool.token0.address.toLowerCase()) || null;
    const token1Price = priceMap.get(pool.token1.address.toLowerCase()) || null;
    const volatilityImpactPct = liquidityUsd > 0
      ? Math.min(100, safeDiv(activity.volume24hUsd, liquidityUsd) * 100)
      : 0;

    return {
      poolRef: `avax_${pool.poolAddress.toLowerCase()}`,
      poolId: `avax_${pool.poolAddress.toLowerCase()}`,
      poolAddress: pool.poolAddress,
      addressSource: `avalanche-rpc:${pool.protocolType}`,
      confidenceLevel: confidenceFromPrices(token0Price, token1Price),
      entityType: "amm",
      dex: pool.dexId,
      chain,
      tokenAName: pool.token0.name,
      tokenASymbol: pool.token0.symbol,
      tokenAAddress: pool.token0.address,
      tokenADecimals: pool.token0.decimals,
      tokenBName: pool.token1.name,
      tokenBSymbol: pool.token1.symbol,
      tokenBAddress: pool.token1.address,
      tokenBDecimals: pool.token1.decimals,
      liquidityUsd,
      volume24hUsd: activity.volume24hUsd,
      volume7dUsd: activity.volume7dUsd == null ? 0 : activity.volume7dUsd,
      tx24h: activity.tx24h,
      tx7d: activity.tx7d == null ? 0 : activity.tx7d,
      feePct: typeof pool.feePct === "number" ? round(pool.feePct, 6) : 0,
      liquidityDepthUsd: liquidityUsd,
      volatilityImpactPct: round(volatilityImpactPct, 6),
      liquidityConcentrationPct: 0,
      feeStabilityPct: typeof pool.feeStabilityPct === "number" ? round(pool.feeStabilityPct, 6) : 0,
      contractIsProxy: Boolean(pool.contractIsProxy),
      contractIsUpgradeable: Boolean(pool.contractIsUpgradeable),
      contractAdmin: pool.contractAdmin || "unknown",
      contractOwner: pool.contractOwner || "unknown",
      contractHasTimelock: Boolean(pool.contractHasTimelock),
      protocolDependencies: Array.isArray(pool.protocolDependencies) ? pool.protocolDependencies : [],
      poolUpdatedAt: nowIso,
      dataSource: "avalanche-rpc",
    };
  }

  function applyLiquidityConcentration(rows) {
    const total = rows.reduce((acc, r) => acc + (r.liquidityUsd || 0), 0);
    for (const row of rows) {
      row.liquidityConcentrationPct = total > 0
        ? round((row.liquidityUsd / total) * 100, 6)
        : 0;
    }
  }

  function latestGeckoFile() {
    const files = fs
      .readdirSync(outputDir)
      .filter((name) => /^avaxPools_gecko_.*\.json$/i.test(name))
      .sort();

    return files.length ? path.join(outputDir, files[files.length - 1]) : null;
  }

  function compareVsGecko(rows) {
    try {
      const file = latestGeckoFile();
      if (!file) {
        log("PARITY", "No Gecko snapshot found for comparison");
        return;
      }

      const gecko = JSON.parse(fs.readFileSync(file, "utf8"));
      const topNative = [...rows]
        .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
        .slice(0, 5)
        .map((x) => `${x.dex}:${x.tokenASymbol}/${x.tokenBSymbol} $${round(x.liquidityUsd, 2)}`);

      const topGecko = [...gecko]
        .sort((a, b) => Number(b.liquidityUsd || 0) - Number(a.liquidityUsd || 0))
        .slice(0, 5)
        .map((x) => `${x.dex}:${x.tokenASymbol}/${x.tokenBSymbol} $${round(Number(x.liquidityUsd || 0), 2)}`);

      log("PARITY", "Top native liquidity", topNative.join(" | "));
      log("PARITY", "Top gecko liquidity", topGecko.join(" | "));
    } catch (err) {
      log("PARITY", "Comparison failed", err?.message || String(err));
    }
  }

  return { normalizeRow, applyLiquidityConcentration, compareVsGecko };
}

module.exports = { createOutputHelpers };
