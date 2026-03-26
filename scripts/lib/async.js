function createAsyncHelpers() {
  async function mapWithConcurrency(items, concurrency, mapper) {
    const list = Array.isArray(items) ? items : [];
    const limit = Math.max(1, Number(concurrency) || 1);
    const results = new Array(list.length);
    let nextIndex = 0;

    async function worker() {
      while (true) {
        const current = nextIndex;
        nextIndex += 1;
        if (current >= list.length) return;
        results[current] = await mapper(list[current], current);
      }
    }

    const workerCount = Math.min(limit, list.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
  }

  return { mapWithConcurrency };
}

module.exports = { createAsyncHelpers };
