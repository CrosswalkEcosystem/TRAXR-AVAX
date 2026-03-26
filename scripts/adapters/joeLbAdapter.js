async function discoverPools(ctx, dex, latestBlock) {
  const { Contract, lbFactoryAbi, withRetry, choosePairIndices, config, log, constants, mapWithConcurrency } = ctx;
  const factory = new Contract(dex.factoryAddress, lbFactoryAbi, ctx.activeProvider || ctx.provider);

  const total = Number(await withRetry(() => factory.getNumberOfLBPairs(), `${dex.dexId}.getNumberOfLBPairs`));
  const candidateTarget = Math.min(
    total,
    Math.max(config.topPoolsPerDex, config.topPoolsPerDex * config.candidateMultiplier),
  );
  const indices = choosePairIndices(total, candidateTarget, config.pairScanMode);

  log(
    "DISCOVER",
    `DEX ${dex.dexId} LB pairs`,
    `total=${total}, candidates=${indices.length}, mode=${config.pairScanMode}`,
  );

  const addressSet = new Set();
  const pairs = await mapWithConcurrency(
    indices,
    config.discoverRpcConcurrency,
    async (i) => withRetry(() => factory.getLBPairAtIndex(i), `${dex.dexId}.getLBPairAtIndex(${i})`),
  );
  for (const pair of pairs) {
    if (pair && pair.toLowerCase() !== constants.ZERO_ADDRESS) addressSet.add(pair.toLowerCase());
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
  const { Contract, lbPairAbi, withRetry, getTokenMeta, toNumber } = ctx;
  const includeMetadata = arguments[3]?.includeMetadata !== false;
  const lb = new Contract(pool.poolAddress, lbPairAbi, ctx.activeProvider || ctx.provider);

  const [tokenXAddress, tokenYAddress, reserves, binStep] = await Promise.all([
    withRetry(() => lb.getTokenX(), `${pool.dexId}.getTokenX ${pool.poolAddress}`),
    withRetry(() => lb.getTokenY(), `${pool.dexId}.getTokenY ${pool.poolAddress}`),
    withRetry(() => lb.getReserves(), `${pool.dexId}.getReserves ${pool.poolAddress}`),
    withRetry(() => lb.getBinStep(), `${pool.dexId}.getBinStep ${pool.poolAddress}`).catch(() => null),
  ]);

  const [token0, token1] = await Promise.all([
    getTokenMeta(ctx.activeProvider || ctx.provider, tokenXAddress, tokenCache, { includeMetadata }),
    getTokenMeta(ctx.activeProvider || ctx.provider, tokenYAddress, tokenCache, { includeMetadata }),
  ]);

  return {
    ...pool,
    token0,
    token1,
    amount0: toNumber(reserves.reserveX, token0.decimals, ctx.formatUnits),
    amount1: toNumber(reserves.reserveY, token1.decimals, ctx.formatUnits),
    binStep: binStep == null ? null : Number(binStep),
    feePct: pool.feePct ?? null,
    swapType: "joe_lb",
  };
}

module.exports = { discoverPools, enrichPool };
