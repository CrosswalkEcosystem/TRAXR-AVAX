function createTokenMetaLoader({ Contract, erc20Abi, withRetry }) {
  return async function getTokenMeta(provider, address, cache) {
    const key = address.toLowerCase();
    if (cache.has(key)) return cache.get(key);

    const token = new Contract(address, erc20Abi, provider);
    const [name, symbol, decimals] = await Promise.all([
      withRetry(() => token.name(), `token.name ${address}`).catch(() => null),
      withRetry(() => token.symbol(), `token.symbol ${address}`).catch(() => null),
      withRetry(() => token.decimals(), `token.decimals ${address}`).catch(() => null),
    ]);

    const meta = {
      address,
      name: name || null,
      symbol: symbol || null,
      decimals: decimals == null ? 18 : Number(decimals),
    };

    cache.set(key, meta);
    return meta;
  };
}

module.exports = { createTokenMetaLoader };
