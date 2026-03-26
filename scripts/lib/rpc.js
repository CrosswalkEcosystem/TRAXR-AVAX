function createRpcHelpers({ retryCount, retryDelayMs, log, mapWithConcurrency, logChunkConcurrency }) {
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function withRetry(fn, label) {
    let lastErr;
    for (let i = 0; i < retryCount; i += 1) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (err?.code === "BAD_DATA" || String(err?.message || "").includes("could not decode result data")) {
          throw err;
        }
        const message = err?.message || String(err);
        if (i < retryCount - 1) {
          log("RETRY", `${label} failed, retrying`, `${i + 1}/${retryCount} ${message}`);
          await sleep(retryDelayMs * (i + 1));
        }
      }
    }
    throw lastErr;
  }

  async function getLogsChunked(provider, params, maxRange) {
    const { fromBlock, toBlock } = params;
    const ranges = [];
    for (let start = fromBlock; start <= toBlock; start += maxRange + 1) {
      ranges.push([start, Math.min(toBlock, start + maxRange)]);
    }

    const chunks = await mapWithConcurrency(
      ranges,
      logChunkConcurrency,
      async ([start, end]) => withRetry(
        () => provider.getLogs({ ...params, fromBlock: start, toBlock: end }),
        `eth_getLogs ${params.address} ${start}-${end}`,
      ),
    );

    return chunks.flat();
  }

  return { withRetry, getLogsChunked };
}

module.exports = { createRpcHelpers };
