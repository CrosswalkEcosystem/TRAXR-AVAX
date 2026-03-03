function createPricingHelpers({ round, toNumber, formatUnits, v2VolumeMode = "auto" }) {
  function absBigInt(x) {
    return x < 0n ? -x : x;
  }

  function decodePacked128x2(value) {
    try {
      const v = typeof value === "bigint" ? value : BigInt(value);
      const mask = (1n << 128n) - 1n;
      const low = v & mask;
      const high = (v >> 128n) & mask;
      return { low, high };
    } catch {
      return { low: 0n, high: 0n };
    }
  }

  function usdFromAmounts(amount0, amount1, pool, priceMap) {
    const p0 = priceMap.get(pool.token0.address.toLowerCase()) || null;
    const p1 = priceMap.get(pool.token1.address.toLowerCase()) || null;
    const isStable0 = p0 != null && Math.abs(p0 - 1) <= 0.02;
    const isStable1 = p1 != null && Math.abs(p1 - 1) <= 0.02;

    const usd0 = p0 != null ? amount0 * p0 : null;
    const usd1 = p1 != null ? amount1 * p1 : null;

    if (usd0 != null && usd1 != null) {
      if (isStable0 && !isStable1) return usd0;
      if (!isStable0 && isStable1) return usd1;
      return (usd0 + usd1) / 2;
    }
    if (usd0 != null) return usd0;
    if (usd1 != null) return usd1;
    return 0;
  }

  function seedPrices(stablePriceMap) {
    const priceMap = new Map();
    for (const [address, price] of Object.entries(stablePriceMap)) {
      priceMap.set(address.toLowerCase(), price);
    }
    return priceMap;
  }

  function aggregateCandidates(candidates) {
    if (!candidates.length) return null;
    const sorted = [...candidates].sort((a, b) => b.weight - a.weight);
    const top = sorted.slice(0, 12);

    let totalWeight = 0;
    let weighted = 0;
    for (const c of top) {
      totalWeight += c.weight;
      weighted += c.price * c.weight;
    }
    if (totalWeight <= 0) return null;
    return weighted / totalWeight;
  }

  function derivePrices(pools, priceMap) {
    for (let pass = 0; pass < 10; pass += 1) {
      const candidatesByToken = new Map();

      for (const pool of pools) {
        if (!pool.amount0 || !pool.amount1) continue;

        const t0 = pool.token0.address.toLowerCase();
        const t1 = pool.token1.address.toLowerCase();
        const p0 = priceMap.get(t0);
        const p1 = priceMap.get(t1);

        if (p0 && !p1 && pool.amount1 > 0) {
          const candidate = (pool.amount0 * p0) / pool.amount1;
          const weight = pool.amount0 * p0; // known-side USD depth
          if (Number.isFinite(candidate) && candidate > 0 && Number.isFinite(weight) && weight > 50) {
            const list = candidatesByToken.get(t1) || [];
            list.push({ price: candidate, weight });
            candidatesByToken.set(t1, list);
          }
        }

        if (!p0 && p1 && pool.amount0 > 0) {
          const candidate = (pool.amount1 * p1) / pool.amount0;
          const weight = pool.amount1 * p1; // known-side USD depth
          if (Number.isFinite(candidate) && candidate > 0 && Number.isFinite(weight) && weight > 50) {
            const list = candidatesByToken.get(t0) || [];
            list.push({ price: candidate, weight });
            candidatesByToken.set(t0, list);
          }
        }
      }

      let updated = 0;
      for (const [token, candidates] of candidatesByToken.entries()) {
        if (priceMap.has(token)) continue;
        const price = aggregateCandidates(candidates);
        if (price && Number.isFinite(price) && price > 0) {
          priceMap.set(token, price);
          updated += 1;
        }
      }

      if (updated === 0) break;
    }
  }

  function computeLiquidityUsd(pool, priceMap) {
    if (Array.isArray(pool.tokens) && pool.tokens.length) {
      let total = 0;
      let pricedCount = 0;
      for (const token of pool.tokens) {
        const p = priceMap.get(String(token.address || "").toLowerCase());
        if (p != null && Number.isFinite(p) && p > 0) {
          total += (Number(token.amount) || 0) * p;
          pricedCount += 1;
        }
      }
      if (pricedCount > 0) return round(total);
    }

    const p0 = priceMap.get(pool.token0.address.toLowerCase()) || null;
    const p1 = priceMap.get(pool.token1.address.toLowerCase()) || null;

    const usd0 = p0 != null ? pool.amount0 * p0 : null;
    const usd1 = p1 != null ? pool.amount1 * p1 : null;

    if (usd0 != null && usd1 != null) return round(usd0 + usd1);
    if (usd0 != null) return round(usd0 * 2);
    if (usd1 != null) return round(usd1 * 2);
    return 0;
  }

  function v2SwapUsd(logParsed, pool, priceMap) {
    const p0 = priceMap.get(pool.token0.address.toLowerCase()) || null;
    const p1 = priceMap.get(pool.token1.address.toLowerCase()) || null;

    const a0In = toNumber(logParsed.args.amount0In, pool.token0.decimals, formatUnits);
    const a0Out = toNumber(logParsed.args.amount0Out, pool.token0.decimals, formatUnits);
    const a1In = toNumber(logParsed.args.amount1In, pool.token1.decimals, formatUnits);
    const a1Out = toNumber(logParsed.args.amount1Out, pool.token1.decimals, formatUnits);

    const usdIn0 = p0 != null ? a0In * p0 : null;
    const usdIn1 = p1 != null ? a1In * p1 : null;
    const usdOut0 = p0 != null ? a0Out * p0 : null;
    const usdOut1 = p1 != null ? a1Out * p1 : null;

    const sumIn = (usdIn0 || 0) + (usdIn1 || 0);
    const sumOut = (usdOut0 || 0) + (usdOut1 || 0);

    if (v2VolumeMode === "max") {
      return Math.max(sumIn, sumOut, 0);
    }

    const isStable0 = p0 != null && Math.abs(p0 - 1) <= 0.02;
    const isStable1 = p1 != null && Math.abs(p1 - 1) <= 0.02;
    const canUseStableSide = (isStable0 && !isStable1) || (!isStable0 && isStable1);

    if (v2VolumeMode === "stable_side" || (v2VolumeMode === "auto" && canUseStableSide)) {
      if (isStable0 && !isStable1) return Math.max(usdIn0 || 0, usdOut0 || 0);
      if (!isStable0 && isStable1) return Math.max(usdIn1 || 0, usdOut1 || 0);
    }

    if (sumIn > 0 && sumOut > 0) return (sumIn + sumOut) / 2;
    if (sumIn > 0) return sumIn;
    if (sumOut > 0) return sumOut;

    const a0 = Math.max(a0In, a0Out);
    const a1 = Math.max(a1In, a1Out);
    return usdFromAmounts(a0, a1, pool, priceMap);
  }

  function v3SwapUsd(logParsed, pool, priceMap) {
    const amount0Abs = absBigInt(logParsed.args.amount0);
    const amount1Abs = absBigInt(logParsed.args.amount1);

    const a0 = toNumber(amount0Abs, pool.token0.decimals, formatUnits);
    const a1 = toNumber(amount1Abs, pool.token1.decimals, formatUnits);

    return usdFromAmounts(a0, a1, pool, priceMap);
  }

  function joeLbSwapUsd(logParsed, pool, priceMap) {
    const inPacked = decodePacked128x2(logParsed.args.amountsIn);
    const outPacked = decodePacked128x2(logParsed.args.amountsOut);

    const amountX = inPacked.low > outPacked.low ? inPacked.low : outPacked.low;
    const amountY = inPacked.high > outPacked.high ? inPacked.high : outPacked.high;

    const a0 = toNumber(amountX, pool.token0.decimals, formatUnits);
    const a1 = toNumber(amountY, pool.token1.decimals, formatUnits);

    return usdFromAmounts(a0, a1, pool, priceMap);
  }

  function balancerSwapUsd(logParsed, pool, priceMap) {
    const tokenInAddr = String(logParsed.args.tokenIn || "").toLowerCase();
    const tokenOutAddr = String(logParsed.args.tokenOut || "").toLowerCase();
    const tokenIn = Array.isArray(pool.tokens)
      ? pool.tokens.find((t) => String(t.address || "").toLowerCase() === tokenInAddr)
      : null;
    const tokenOut = Array.isArray(pool.tokens)
      ? pool.tokens.find((t) => String(t.address || "").toLowerCase() === tokenOutAddr)
      : null;

    const decIn = tokenIn?.decimals ?? 18;
    const decOut = tokenOut?.decimals ?? 18;
    const amountIn = toNumber(logParsed.args.amountIn, decIn, formatUnits);
    const amountOut = toNumber(logParsed.args.amountOut, decOut, formatUnits);

    const pIn = priceMap.get(tokenInAddr) ?? null;
    const pOut = priceMap.get(tokenOutAddr) ?? null;
    const usdIn = pIn != null ? amountIn * pIn : null;
    const usdOut = pOut != null ? amountOut * pOut : null;

    const isStableIn = pIn != null && Math.abs(pIn - 1) <= 0.02;
    const isStableOut = pOut != null && Math.abs(pOut - 1) <= 0.02;

    if (usdIn != null && usdOut != null) {
      if (isStableIn && !isStableOut) return usdIn;
      if (!isStableIn && isStableOut) return usdOut;
      return (usdIn + usdOut) / 2;
    }
    if (usdIn != null) return usdIn;
    if (usdOut != null) return usdOut;
    return 0;
  }

  return {
    seedPrices,
    derivePrices,
    computeLiquidityUsd,
    v2SwapUsd,
    v3SwapUsd,
    joeLbSwapUsd,
    balancerSwapUsd,
  };
}

module.exports = { createPricingHelpers };
