const fs = require("fs");

function loadRegistry(registryPath) {
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Registry missing at ${registryPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const items = Array.isArray(raw) ? raw : raw.dexes;
  if (!Array.isArray(items)) {
    throw new Error("Invalid registry format. Expected array or { dexes: [] }.");
  }

  return items
    .map((x) => (typeof x === "string" ? { dexId: x } : x))
    .filter((x) => x && typeof x.dexId === "string");
}

function loadFactories(factoriesPath) {
  if (!fs.existsSync(factoriesPath)) {
    throw new Error(`Factories config missing at ${factoriesPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(factoriesPath, "utf8"));
  const dexFactories = Array.isArray(raw.dexFactories) ? raw.dexFactories : [];
  const adapters = raw.adapters && typeof raw.adapters === "object" ? raw.adapters : {};

  return { dexFactories, adapters };
}

function buildDexRuntimeConfigs(registryItems, factoriesConfig, normalizeAddressMaybe) {
  const byDex = new Map();
  for (const dex of factoriesConfig.dexFactories) {
    if (dex && typeof dex.dexId === "string") {
      byDex.set(dex.dexId, dex);
    }
  }

  const runtime = [];
  const missing = [];

  for (const reg of registryItems) {
    const cfg = byDex.get(reg.dexId);
    if (!cfg) {
      missing.push(reg.dexId);
      continue;
    }
    if (cfg.enabled === false) continue;

    const adapter = cfg.adapter || reg.adapter || null;
    const protocolType = cfg.protocolType || reg.protocolType || adapter || null;
    const factoryAddress = normalizeAddressMaybe(cfg.factoryAddress || reg.factoryAddress || null);

    runtime.push({
      dexId: reg.dexId,
      adapter,
      protocolType,
      factoryAddress,
      deployBlock: cfg.deployBlock ?? reg.deployBlock ?? null,
      defaultFeePct: cfg.defaultFeePct ?? reg.defaultFeePct ?? null,
      protocolDependencies: Array.isArray(cfg.protocolDependencies)
        ? cfg.protocolDependencies
        : Array.isArray(reg.protocolDependencies)
          ? reg.protocolDependencies
          : [],
      feeStabilityPct: cfg.feeStabilityPct ?? reg.feeStabilityPct ?? null,
      notes: cfg.notes || null,
    });
  }

  return { runtime, missing };
}

function loadDexRuntimeConfigs(registryPath, factoriesPath, normalizeAddressMaybe) {
  const registry = loadRegistry(registryPath);
  const factoriesConfig = loadFactories(factoriesPath);
  const merged = buildDexRuntimeConfigs(registry, factoriesConfig, normalizeAddressMaybe);
  return { registry, factoriesConfig, ...merged };
}

module.exports = {
  loadRegistry,
  loadFactories,
  buildDexRuntimeConfigs,
  loadDexRuntimeConfigs,
};
