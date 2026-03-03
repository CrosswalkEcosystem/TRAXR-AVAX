const fs = require("fs");

function loadFieldPolicy(policyPath) {
  if (!fs.existsSync(policyPath)) {
    return {
      defaults: {},
      protocolDefaults: {},
      timelockAddressSet: new Set(),
    };
  }

  const raw = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  const defaults = raw && typeof raw.defaults === "object" ? raw.defaults : {};
  const protocolDefaults =
    raw && typeof raw.protocolDefaults === "object" ? raw.protocolDefaults : {};
  const timelockAddresses = Array.isArray(raw?.timelockAddresses)
    ? raw.timelockAddresses
    : [];

  return {
    defaults,
    protocolDefaults,
    timelockAddressSet: new Set(
      timelockAddresses
        .filter((x) => typeof x === "string" && /^0x[a-fA-F0-9]{40}$/.test(x))
        .map((x) => x.toLowerCase()),
    ),
  };
}

function applyPoolFieldPolicy(pool, dexConfig, policy) {
  const protocol = pool.protocolType || dexConfig?.protocolType || "unknown";
  const proto = policy.protocolDefaults[protocol] || {};
  const defaults = policy.defaults || {};

  return {
    ...pool,
    feePct:
      typeof pool.feePct === "number"
        ? pool.feePct
        : typeof dexConfig?.defaultFeePct === "number"
          ? dexConfig.defaultFeePct
          : typeof proto.feePct === "number"
            ? proto.feePct
            : Number(defaults.feePct || 0),
    feeStabilityPct:
      typeof pool.feeStabilityPct === "number"
        ? pool.feeStabilityPct
        : typeof proto.feeStabilityPct === "number"
          ? proto.feeStabilityPct
          : Number(defaults.feeStabilityPct || 0),
    protocolDependencies: Array.isArray(pool.protocolDependencies) && pool.protocolDependencies.length
      ? pool.protocolDependencies
      : Array.isArray(dexConfig?.protocolDependencies) && dexConfig.protocolDependencies.length
        ? dexConfig.protocolDependencies
        : Array.isArray(proto.protocolDependencies)
          ? proto.protocolDependencies
          : [],
  };
}

module.exports = {
  loadFieldPolicy,
  applyPoolFieldPolicy,
};
