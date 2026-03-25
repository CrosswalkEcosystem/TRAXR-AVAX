async function discoverPools(ctx, dex, latestBlock) {
  const { getLogsChunked, balancerVaultIface, config, fs, path, log } = ctx;
  if (!dex.factoryAddress) return [];

  const topic = balancerVaultIface.getEvent("PoolRegistered").topicHash;
  const cacheFile = path.join(config.balancerCacheDir, `${dex.dexId}_pools.json`);
  const poolMap = new Map();

  let nextToBlock = latestBlock;
  if (fs.existsSync(cacheFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (Array.isArray(raw.pools)) {
        for (const item of raw.pools) {
          if (!item || !item.poolAddress) continue;
          poolMap.set(String(item.poolAddress).toLowerCase(), item);
        }
      }
      if (Number.isInteger(raw.nextToBlock)) nextToBlock = Number(raw.nextToBlock);
    } catch {}
  } else {
    nextToBlock = Math.max(0, latestBlock - config.balancerLookbackBlocks);
  }

  let scannedChunks = 0;
  const maxChunks = Math.max(1, Number(config.balancerMaxChunksPerRun || 1));
  while (nextToBlock >= 0 && scannedChunks < maxChunks) {
    const fromBlock = Math.max(0, nextToBlock - config.logMaxRange);
    const logs = await getLogsChunked(
      ctx.provider,
      {
        address: dex.factoryAddress,
        topics: [topic],
        fromBlock,
        toBlock: nextToBlock,
      },
      config.logMaxRange,
    );

    for (const logItem of logs) {
      try {
        const parsed = balancerVaultIface.parseLog(logItem);
        const poolAddress = String(parsed.args.poolAddress).toLowerCase();
        poolMap.set(poolAddress, {
          dexId: dex.dexId,
          protocolType: dex.protocolType,
          poolAddress,
          poolId: String(parsed.args.poolId).toLowerCase(),
          vaultAddress: dex.factoryAddress,
          feePct: typeof dex.defaultFeePct === "number" ? dex.defaultFeePct : null,
          eventBlock: logItem.blockNumber,
        });
      } catch {
        // ignore parse failures
      }
    }

    nextToBlock = fromBlock - 1;
    scannedChunks += 1;
  }

  fs.mkdirSync(config.balancerCacheDir, { recursive: true });
  fs.writeFileSync(
    cacheFile,
    JSON.stringify(
      {
        dexId: dex.dexId,
        latestBlockAtRun: latestBlock,
        nextToBlock,
        fullyIndexed: nextToBlock < 0,
        pools: [...poolMap.values()],
      },
      null,
      2,
    ),
  );

  if (nextToBlock >= 0) {
    log(
      "DISCOVER",
      `DEX ${dex.dexId} balancer index partial`,
      `nextToBlock=${nextToBlock}, latest=${latestBlock}, chunks=${scannedChunks}/${maxChunks}`,
    );
  }

  const candidateTarget = Math.max(config.topPoolsPerDex, config.topPoolsPerDex * config.candidateMultiplier);
  return [...poolMap.values()]
    .filter((item) => Number(item.eventBlock || 0) <= latestBlock)
    .sort((a, b) => Number(b.eventBlock || 0) - Number(a.eventBlock || 0))
    .slice(0, candidateTarget);
}

async function enrichPool(ctx, pool, tokenCache) {
  const { Contract, balancerVaultAbi, withRetry, getTokenMeta, toNumber } = ctx;
  const vault = new Contract(pool.vaultAddress, balancerVaultAbi, ctx.activeProvider || ctx.provider);

  const poolTokens = await withRetry(
    () => vault.getPoolTokens(pool.poolId),
    `${pool.dexId}.getPoolTokens ${pool.poolId}`,
  );

  const tokens = Array.isArray(poolTokens.tokens) ? poolTokens.tokens : [];
  const balances = Array.isArray(poolTokens.balances) ? poolTokens.balances : [];
  if (tokens.length < 2 || balances.length < 2) {
    throw new Error("balancer pool has fewer than 2 tokens");
  }

  const metas = await Promise.all(tokens.map((addr) => getTokenMeta(ctx.activeProvider || ctx.provider, addr, tokenCache)));
  const rows = metas.map((meta, i) => ({
    address: meta.address,
    name: meta.name,
    symbol: meta.symbol,
    decimals: meta.decimals,
    amount: toNumber(balances[i] || 0n, meta.decimals, ctx.formatUnits),
  }));

  const sorted = [...rows].sort((a, b) => b.amount - a.amount);
  const token0 = sorted[0];
  const token1 = sorted[1];

  return {
    ...pool,
    token0,
    token1,
    tokens: rows,
    amount0: token0.amount,
    amount1: token1.amount,
    swapType: "balancer",
  };
}

module.exports = { discoverPools, enrichPool };
