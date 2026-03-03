async function discoverPools(ctx, dex, latestBlock) {
  const { getLogsChunked, v3FactoryIface, config, path, fs, log } = ctx;
  const deployBlock = Number(dex.deployBlock || 0);
  if (deployBlock > latestBlock) return [];

  const topic = v3FactoryIface.getEvent("PoolCreated").topicHash;
  const cacheFile = path.join(config.v3CacheDir, `${dex.dexId}_pools.json`);
  const poolMap = new Map();

  let lastIndexedBlock;
  if (fs.existsSync(cacheFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (Array.isArray(raw.pools)) {
        for (const item of raw.pools) {
          if (!item || !item.poolAddress) continue;
          poolMap.set(String(item.poolAddress).toLowerCase(), item);
        }
      }
      lastIndexedBlock = Number(raw.lastIndexedBlock || deployBlock);
    } catch {
      lastIndexedBlock = deployBlock;
    }
  } else {
    lastIndexedBlock = deployBlock;
  }

  const fromBlock = config.v3FullHistory
    ? Math.max(deployBlock, lastIndexedBlock)
    : Math.max(deployBlock, latestBlock - config.v3LookbackBlocks);

  let nextFrom = fromBlock;
  let scannedChunks = 0;
  const maxChunks = Math.max(1, Number(config.v3MaxChunksPerRun || 1));

  while (nextFrom <= latestBlock && scannedChunks < maxChunks) {
    const toBlock = Math.min(latestBlock, nextFrom + config.logMaxRange);
    const logs = await getLogsChunked(
      ctx.provider,
      {
        address: dex.factoryAddress,
        topics: [topic],
        fromBlock: nextFrom,
        toBlock,
      },
      config.logMaxRange,
    );

    for (const logItem of logs) {
      try {
        const parsed = v3FactoryIface.parseLog(logItem);
        const key = String(parsed.args.pool).toLowerCase();
        poolMap.set(key, {
          dexId: dex.dexId,
          protocolType: dex.protocolType,
          poolAddress: parsed.args.pool,
          feePct: Number(parsed.args.fee) / 10000,
          eventBlock: logItem.blockNumber,
        });
      } catch {}
    }

    nextFrom = toBlock + 1;
    scannedChunks += 1;
  }

  const indexedTo = Math.min(latestBlock, nextFrom - 1);
  fs.mkdirSync(config.v3CacheDir, { recursive: true });
  fs.writeFileSync(
    cacheFile,
    JSON.stringify(
      {
        dexId: dex.dexId,
        lastIndexedBlock: indexedTo,
        latestBlockAtRun: latestBlock,
        fullyIndexed: indexedTo >= latestBlock,
        pools: [...poolMap.values()],
      },
      null,
      2,
    ),
  );

  if (indexedTo < latestBlock) {
    log(
      "DISCOVER",
      `DEX ${dex.dexId} v3 index partial`,
      `indexedTo=${indexedTo}, latest=${latestBlock}, chunks=${scannedChunks}/${maxChunks}`,
    );
  }

  const candidateTarget = Math.max(
    config.topPoolsPerDex,
    config.topPoolsPerDex * config.candidateMultiplier,
  );
  return [...poolMap.values()]
    .sort((a, b) => Number(b.eventBlock || 0) - Number(a.eventBlock || 0))
    .slice(0, candidateTarget);
}

async function enrichPool(ctx, pool, tokenCache) {
  const { Contract, v3PoolAbi, erc20Abi, withRetry, getTokenMeta, toNumber } = ctx;
  const v3 = new Contract(pool.poolAddress, v3PoolAbi, ctx.provider);

  const [token0Address, token1Address, feeRaw] = await Promise.all([
    withRetry(() => v3.token0(), `${pool.dexId}.token0 ${pool.poolAddress}`),
    withRetry(() => v3.token1(), `${pool.dexId}.token1 ${pool.poolAddress}`),
    withRetry(() => v3.fee(), `${pool.dexId}.fee ${pool.poolAddress}`).catch(() => null),
  ]);

  const [token0, token1] = await Promise.all([
    getTokenMeta(ctx.provider, token0Address, tokenCache),
    getTokenMeta(ctx.provider, token1Address, tokenCache),
  ]);

  const token0Contract = new Contract(token0Address, erc20Abi, ctx.provider);
  const token1Contract = new Contract(token1Address, erc20Abi, ctx.provider);

  const [balance0, balance1] = await Promise.all([
    withRetry(() => token0Contract.balanceOf(pool.poolAddress), `${pool.dexId}.balance0 ${pool.poolAddress}`),
    withRetry(() => token1Contract.balanceOf(pool.poolAddress), `${pool.dexId}.balance1 ${pool.poolAddress}`),
  ]);

  return {
    ...pool,
    token0,
    token1,
    amount0: toNumber(balance0, token0.decimals, ctx.formatUnits),
    amount1: toNumber(balance1, token1.decimals, ctx.formatUnits),
    feePct: feeRaw != null ? Number(feeRaw) / 10000 : pool.feePct,
    swapType: "v3",
  };
}

module.exports = { discoverPools, enrichPool };
