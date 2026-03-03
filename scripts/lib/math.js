function round(value, dp = 6) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}

function toNumber(value, decimals, formatUnits) {
  try {
    return Number(formatUnits(value, decimals));
  } catch {
    return 0;
  }
}

function safeDiv(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return a / b;
}

function confidenceFromPrices(price0, price1) {
  if (price0 && price1) return "high";
  if (price0 || price1) return "medium";
  return "low";
}

function choosePairIndices(total, count, mode) {
  const take = Math.min(Math.max(1, count), total);
  const out = [];

  if (mode === "newest") {
    for (let i = total - 1; i >= Math.max(0, total - take); i -= 1) out.push(i);
    return out;
  }

  if (mode === "oldest") {
    for (let i = 0; i < take; i += 1) out.push(i);
    return out;
  }

  if (take === 1) return [0];
  const step = (total - 1) / (take - 1);
  for (let i = 0; i < take; i += 1) out.push(Math.round(i * step));
  return [...new Set(out)];
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "").replace("Z", "Z");
}

module.exports = {
  round,
  toNumber,
  safeDiv,
  confidenceFromPrices,
  choosePairIndices,
  timestampSlug,
};
