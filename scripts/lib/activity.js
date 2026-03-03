function createActivityComputer({
  blockPerDay,
  enable7d,
  logMaxRange,
  getLogsChunked,
  v2SwapIface,
  v3SwapIface,
  lbSwapIface,
  balancerSwapIface,
  pricing,
  round,
}) {
  function swapUsdFromParsed(pool, parsed, priceMap) {
    try {
      if (pool.swapType === "balancer") return pricing.balancerSwapUsd(parsed, pool, priceMap);
      if (pool.swapType === "v3") return pricing.v3SwapUsd(parsed, pool, priceMap);
      if (pool.swapType === "joe_lb") return pricing.joeLbSwapUsd(parsed, pool, priceMap);
      return pricing.v2SwapUsd(parsed, pool, priceMap);
    } catch {
      return 0;
    }
  }

  return async function computeActivity(provider, pool, latestBlock, priceMap, windowBlocks = null) {
    const from24 = windowBlocks && Number.isInteger(windowBlocks.from24)
      ? windowBlocks.from24
      : Math.max(0, latestBlock - blockPerDay);
    const swapTopic = pool.swapType === "v3"
      ? v3SwapIface.getEvent("Swap").topicHash
      : pool.swapType === "joe_lb"
        ? lbSwapIface.getEvent("Swap").topicHash
        : pool.swapType === "balancer"
          ? balancerSwapIface.getEvent("Swap").topicHash
        : v2SwapIface.getEvent("Swap").topicHash;

    let logs24;
    try {
      logs24 = await getLogsChunked(
        provider,
        {
          address: pool.swapType === "balancer" ? pool.vaultAddress : pool.poolAddress,
          topics: pool.swapType === "balancer"
            ? [swapTopic, pool.poolId]
            : [swapTopic],
          fromBlock: from24,
          toBlock: latestBlock,
        },
        logMaxRange,
      );
    } catch (err) {
      return {
        tx24h: 0,
        tx7d: enable7d ? 0 : null,
        volume24hUsd: 0,
        volume7dUsd: enable7d ? 0 : null,
        error: err?.message || String(err),
      };
    }

    const txSeen24 = new Set();
    let volume24hUsd = 0;

    for (const item of logs24) {
      if (!item || !item.transactionHash) continue;
      txSeen24.add(item.transactionHash);
      try {
        const parsed = pool.swapType === "v3"
          ? v3SwapIface.parseLog(item)
          : pool.swapType === "joe_lb"
            ? lbSwapIface.parseLog(item)
            : pool.swapType === "balancer"
              ? balancerSwapIface.parseLog(item)
            : v2SwapIface.parseLog(item);
        volume24hUsd += swapUsdFromParsed(pool, parsed, priceMap);
      } catch {}
    }
    const tx24h = txSeen24.size;

    if (!enable7d) {
      return {
        tx24h,
        tx7d: null,
        volume24hUsd: round(volume24hUsd),
        volume7dUsd: null,
        error: null,
      };
    }

    const from7d = windowBlocks && Number.isInteger(windowBlocks.from7d)
      ? windowBlocks.from7d
      : Math.max(0, latestBlock - blockPerDay * 7);
    let logs7d;

    try {
      logs7d = await getLogsChunked(
        provider,
        {
          address: pool.swapType === "balancer" ? pool.vaultAddress : pool.poolAddress,
          topics: pool.swapType === "balancer"
            ? [swapTopic, pool.poolId]
            : [swapTopic],
          fromBlock: from7d,
          toBlock: latestBlock,
        },
        logMaxRange,
      );
    } catch (err) {
      return {
        tx24h,
        tx7d: null,
        volume24hUsd: round(volume24hUsd),
        volume7dUsd: null,
        error: err?.message || String(err),
      };
    }

    const txSeen7d = new Set();
    let volume7dUsd = 0;

    for (const item of logs7d) {
      if (!item || !item.transactionHash) continue;
      txSeen7d.add(item.transactionHash);
      try {
        const parsed = pool.swapType === "v3"
          ? v3SwapIface.parseLog(item)
          : pool.swapType === "joe_lb"
            ? lbSwapIface.parseLog(item)
            : pool.swapType === "balancer"
              ? balancerSwapIface.parseLog(item)
            : v2SwapIface.parseLog(item);
        volume7dUsd += swapUsdFromParsed(pool, parsed, priceMap);
      } catch {}
    }
    const tx7d = txSeen7d.size;

    return {
      tx24h,
      tx7d,
      volume24hUsd: round(volume24hUsd),
      volume7dUsd: round(volume7dUsd),
      error: null,
    };
  };
}

module.exports = { createActivityComputer };
