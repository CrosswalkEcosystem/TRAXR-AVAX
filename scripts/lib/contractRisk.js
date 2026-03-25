const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const EIP1967_ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
const EIP1967_BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function parseStorageAddress(slotValue) {
  if (typeof slotValue !== "string" || !slotValue.startsWith("0x")) return null;
  if (slotValue.length < 66) return null;
  const addr = `0x${slotValue.slice(-40)}`.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(addr)) return null;
  return addr === ZERO_ADDRESS ? null : addr;
}

function createContractRiskEnricher({ provider, Contract, withRetry, abi, policy, log }) {
  const cache = new Map();

  function normalizeOptionalAddress(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "unknown") return null;
    return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
  }

  async function getStorage(address, slot, label) {
    try {
      return await withRetry(
        () => provider.getStorage(address, slot),
        `${label} ${address} ${slot}`,
      );
    } catch {
      return null;
    }
  }

  async function readAddressFunc(contract, fn, label) {
    try {
      const value = await contract[fn]();
      return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
        ? value.toLowerCase()
        : null;
    } catch {
      return null;
    }
  }

  return async function enrich(pool) {
    const key = String(pool.poolAddress || "").toLowerCase();
    if (!key) return pool;
    if (cache.has(key)) {
      return { ...pool, ...cache.get(key) };
    }

    const result = {
      contractIsProxy: false,
      contractIsUpgradeable: false,
      contractAdmin: normalizeOptionalAddress(policy.defaults.contractAdmin),
      contractOwner: normalizeOptionalAddress(policy.defaults.contractOwner),
      contractHasTimelock:
        typeof policy.defaults.contractHasTimelock === "boolean"
          ? policy.defaults.contractHasTimelock
          : null,
    };

    try {
      const code = await withRetry(() => provider.getCode(pool.poolAddress), `eth_getCode ${pool.poolAddress}`);
      const hasCode = typeof code === "string" && code.length > 2;
      if (!hasCode) {
        cache.set(key, result);
        return { ...pool, ...result };
      }

      const [implSlot, adminSlot, beaconSlot] = await Promise.all([
        getStorage(pool.poolAddress, EIP1967_IMPLEMENTATION_SLOT, "eth_getStorageAt"),
        getStorage(pool.poolAddress, EIP1967_ADMIN_SLOT, "eth_getStorageAt"),
        getStorage(pool.poolAddress, EIP1967_BEACON_SLOT, "eth_getStorageAt"),
      ]);

      const impl = parseStorageAddress(implSlot);
      const adminFromSlot = parseStorageAddress(adminSlot);
      const beacon = parseStorageAddress(beaconSlot);

      result.contractIsProxy = Boolean(impl || beacon);
      result.contractIsUpgradeable = Boolean(impl || beacon || adminFromSlot);

      const c = new Contract(pool.poolAddress, abi, provider);
      const [owner1, owner2, admin1] = await Promise.all([
        readAddressFunc(c, "owner", pool.poolAddress),
        readAddressFunc(c, "getOwner", pool.poolAddress),
        readAddressFunc(c, "admin", pool.poolAddress),
      ]);

      const admin = adminFromSlot || admin1 || null;
      const owner = owner1 || owner2 || null;

      result.contractAdmin = normalizeOptionalAddress(admin) || result.contractAdmin;
      result.contractOwner = normalizeOptionalAddress(owner) || result.contractOwner;

      const adminLower = String(result.contractAdmin || "").toLowerCase();
      const ownerLower = String(result.contractOwner || "").toLowerCase();
      if (policy.timelockAddressSet.has(adminLower) || policy.timelockAddressSet.has(ownerLower)) {
        result.contractHasTimelock = true;
      }
    } catch (err) {
      log("WARN", `Contract risk enrich failed ${pool.poolAddress}`, err?.message || String(err));
    }

    cache.set(key, result);
    return { ...pool, ...result };
  };
}

module.exports = { createContractRiskEnricher };
