function createTokenMetaLoader({ Contract, erc20Abi, withRetry }) {
  return async function getTokenMeta(provider, address, cache, options = {}) {
    const includeMetadata = options.includeMetadata !== false;
    const key = address.toLowerCase();
    const cached = cache.get(key);
    if (cached && (!includeMetadata || cached.metadataLoaded)) return cached;

    const token = new Contract(address, erc20Abi, provider);
    let decimals = cached?.decimals ?? null;
    let name = cached?.name ?? null;
    let symbol = cached?.symbol ?? null;

    if (decimals == null) {
      decimals = await withRetry(() => token.decimals(), `token.decimals ${address}`).catch(() => null);
    }

    if (includeMetadata && !cached?.metadataLoaded) {
      [name, symbol] = await Promise.all([
        withRetry(() => token.name(), `token.name ${address}`).catch(() => name),
        withRetry(() => token.symbol(), `token.symbol ${address}`).catch(() => symbol),
      ]);
    }

    const meta = {
      address,
      name: name || null,
      symbol: symbol || null,
      decimals: decimals == null ? 18 : Number(decimals),
      metadataLoaded: includeMetadata || Boolean(cached?.metadataLoaded),
    };

    cache.set(key, meta);
    return meta;
  };
}

module.exports = { createTokenMetaLoader };
