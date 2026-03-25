async function discoverPools(ctx, dex, latestBlock) {
  const { Contract, v2FactoryAbi, withRetry, choosePairIndices, config, log, constants } = ctx;
  const factory = new Contract(dex.factoryAddress, v2FactoryAbi, ctx.activeProvider || ctx.provider);

  const total = Number(await withRetry(() => factory.allPairsLength(), `${dex.dexId}.allPairsLength`));
  const candidateTarget = Math.min(
    total,
    Math.max(config.topPoolsPerDex, config.topPoolsPerDex * config.candidateMultiplier),
  );
  const indices = choosePairIndices(total, candidateTarget, config.pairScanMode);

  log("DISCOVER", `DEX ${dex.dexId} pairs`, `total=${total}, candidates=${indices.length}, mode=${config.pairScanMode}`);

  const addressSet = new Set();
  for (const i of indices) {
    const pair = await withRetry(() => factory.allPairs(i), `${dex.dexId}.allPairs(${i})`);
    if (pair && pair.toLowerCase() !== constants.ZERO_ADDRESS) addressSet.add(pair.toLowerCase());
  }

  for (let i = 0; i < constants.SEED_TOKENS.length; i += 1) {
    for (let j = i + 1; j < constants.SEED_TOKENS.length; j += 1) {
      const pair = await withRetry(
        () => factory.getPair(constants.SEED_TOKENS[i], constants.SEED_TOKENS[j]),
        `${dex.dexId}.getPair(${i},${j})`,
      ).catch(() => constants.ZERO_ADDRESS);
      if (pair && pair.toLowerCase() !== constants.ZERO_ADDRESS) addressSet.add(pair.toLowerCase());
    }
  }

  return [...addressSet].map((poolAddress) => ({
    dexId: dex.dexId,
    protocolType: dex.protocolType,
    poolAddress,
    feePct: typeof dex.defaultFeePct === "number" ? dex.defaultFeePct : null,
    eventBlock: latestBlock,
  }));
}

async function enrichPool(ctx, pool, tokenCache) {
  const { Contract, v2PairAbi, withRetry, getTokenMeta, toNumber } = ctx;
  const pair = new Contract(pool.poolAddress, v2PairAbi, ctx.activeProvider || ctx.provider);

  const [token0Address, token1Address, reserves] = await Promise.all([
    withRetry(() => pair.token0(), `${pool.dexId}.token0 ${pool.poolAddress}`),
    withRetry(() => pair.token1(), `${pool.dexId}.token1 ${pool.poolAddress}`),
    withRetry(() => pair.getReserves(), `${pool.dexId}.getReserves ${pool.poolAddress}`),
  ]);

  const [token0, token1] = await Promise.all([
    getTokenMeta(ctx.activeProvider || ctx.provider, token0Address, tokenCache),
    getTokenMeta(ctx.activeProvider || ctx.provider, token1Address, tokenCache),
  ]);

  return {
    ...pool,
    token0,
    token1,
    amount0: toNumber(reserves.reserve0, token0.decimals, ctx.formatUnits),
    amount1: toNumber(reserves.reserve1, token1.decimals, ctx.formatUnits),
    swapType: "v2",
  };
}

module.exports = { discoverPools, enrichPool };
