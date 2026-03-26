function createActivityComputer({
  blockPerDay,
  enable7d,
  logMaxRange,
  getLogsChunked,
  mapWithConcurrency,
  activityBatchSize,
  activityBatchConcurrency,
  v2SwapIface,
  v3SwapIface,
  lbSwapIface,
  balancerSwapIface,
  pricing,
  round,
}) {
  function chunkList(items, size) {
    const out = [];
    const list = Array.isArray(items) ? items : [];
    const chunkSize = Math.max(1, Number(size) || 1);
    for (let i = 0; i < list.length; i += chunkSize) {
      out.push(list.slice(i, i + chunkSize));
    }
    return out;
  }

  function getSwapTopic(pool) {
    return pool.swapType === "v3"
      ? v3SwapIface.getEvent("Swap").topicHash
      : pool.swapType === "joe_lb"
        ? lbSwapIface.getEvent("Swap").topicHash
        : pool.swapType === "balancer"
          ? balancerSwapIface.getEvent("Swap").topicHash
          : v2SwapIface.getEvent("Swap").topicHash;
  }

  function parseSwapLog(pool, item) {
    return pool.swapType === "v3"
      ? v3SwapIface.parseLog(item)
      : pool.swapType === "joe_lb"
        ? lbSwapIface.parseLog(item)
        : pool.swapType === "balancer"
          ? balancerSwapIface.parseLog(item)
          : v2SwapIface.parseLog(item);
  }

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

  function shouldSplitLogsBatch(err, params) {
    const addresses = params && Array.isArray(params.address) ? params.address : null;
    if (!addresses || addresses.length <= 1) return false;
    const message = String(err?.message || err || "").toLowerCase();
    return message.includes("specify less number of addresses")
      || message.includes("too many addresses")
      || message.includes("array is too large");
  }

  async function getLogsForParams(provider, params) {
    try {
      return await getLogsChunked(provider, params, logMaxRange);
    } catch (err) {
      if (!shouldSplitLogsBatch(err, params)) throw err;
      const addresses = params.address;
      const middle = Math.floor(addresses.length / 2);
      const left = await getLogsForParams(provider, { ...params, address: addresses.slice(0, middle) });
      const right = await getLogsForParams(provider, { ...params, address: addresses.slice(middle) });
      return [...left, ...right];
    }
  }

  async function computeActivities(provider, pools, latestBlock, priceMap, windowBlocks = null) {
    const from24 = windowBlocks && Number.isInteger(windowBlocks.from24)
      ? windowBlocks.from24
      : Math.max(0, latestBlock - blockPerDay);
    const results = new Map();
    const poolList = Array.isArray(pools) ? pools : [];

    for (const pool of poolList) {
      results.set(pool.poolAddress.toLowerCase(), {
        tx24h: 0,
        tx7d: enable7d ? 0 : null,
        volume24hUsd: 0,
        volume7dUsd: enable7d ? 0 : null,
        error: null,
      });
    }

    const groups = new Map();
    for (const pool of poolList) {
      const key = pool.swapType === "balancer"
        ? `balancer:${String(pool.vaultAddress || "").toLowerCase()}`
        : `${pool.swapType}:default`;
      const list = groups.get(key) || [];
      list.push(pool);
      groups.set(key, list);
    }

    async function processChunk(groupPools) {
      const firstPool = groupPools[0];
      if (!firstPool) return;

      const swapTopic = getSwapTopic(firstPool);
      let params;
      let keyFromLog;

      if (firstPool.swapType === "balancer") {
        const poolIdMap = new Map(groupPools.map((pool) => [String(pool.poolId || "").toLowerCase(), pool]));
        params = {
          address: firstPool.vaultAddress,
          topics: [swapTopic, groupPools.map((pool) => String(pool.poolId || "").toLowerCase())],
          fromBlock: from24,
          toBlock: latestBlock,
        };
        keyFromLog = (parsed) => String(parsed?.args?.poolId || "").toLowerCase();

        const logs = await getLogsForParams(provider, params);
        for (const item of logs) {
          if (!item || !item.transactionHash) continue;
          try {
            const parsed = parseSwapLog(firstPool, item);
            const poolKey = keyFromLog(parsed);
            const pool = poolIdMap.get(poolKey);
            if (!pool) continue;
            const result = results.get(pool.poolAddress.toLowerCase());
            if (!result._txSeen24) result._txSeen24 = new Set();
            result._txSeen24.add(item.transactionHash);
            result.volume24hUsd += swapUsdFromParsed(pool, parsed, priceMap);
          } catch {}
        }
        return;
      }

      const poolMap = new Map(groupPools.map((pool) => [pool.poolAddress.toLowerCase(), pool]));
      params = {
        address: groupPools.map((pool) => pool.poolAddress),
        topics: [swapTopic],
        fromBlock: from24,
        toBlock: latestBlock,
      };
      keyFromLog = (item) => String(item?.address || "").toLowerCase();

      const logs = await getLogsForParams(provider, params);
      for (const item of logs) {
        if (!item || !item.transactionHash) continue;
        try {
          const poolKey = keyFromLog(item);
          const pool = poolMap.get(poolKey);
          if (!pool) continue;
          const parsed = parseSwapLog(pool, item);
          const result = results.get(pool.poolAddress.toLowerCase());
          if (!result._txSeen24) result._txSeen24 = new Set();
          result._txSeen24.add(item.transactionHash);
          result.volume24hUsd += swapUsdFromParsed(pool, parsed, priceMap);
        } catch {}
      }
    }

    const tasks = [];
    for (const groupPools of groups.values()) {
      for (const chunk of chunkList(groupPools, activityBatchSize)) {
        tasks.push(chunk);
      }
    }

    await mapWithConcurrency(
      tasks,
      activityBatchConcurrency,
      async (chunk) => {
        try {
          await processChunk(chunk);
        } catch (err) {
          const message = err?.message || String(err);
          for (const pool of chunk) {
            const result = results.get(pool.poolAddress.toLowerCase());
            if (result && !result.error) result.error = message;
          }
        }
      },
    );

    for (const result of results.values()) {
      result.tx24h = result._txSeen24 ? result._txSeen24.size : 0;
      result.volume24hUsd = round(result.volume24hUsd || 0);
      delete result._txSeen24;
    }

    return results;
  }

  async function computeActivity(provider, pool, latestBlock, priceMap, windowBlocks = null) {
    const from24 = windowBlocks && Number.isInteger(windowBlocks.from24)
      ? windowBlocks.from24
      : Math.max(0, latestBlock - blockPerDay);
    const swapTopic = getSwapTopic(pool);

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
  }

  return { computeActivity, computeActivities };
}

module.exports = { createActivityComputer };
