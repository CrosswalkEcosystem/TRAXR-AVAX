import { AvaxPoolMetrics } from "./types";

export const SAMPLE_POOLS: AvaxPoolMetrics[] = [
  {
    // ----------------------------------
    // Pool identity
    // ----------------------------------
    poolId: "avax-usdc-joe-v2",
    mintA: "AVAX",
    mintB: "USDC",
    poolAddress: "0x8e3d0f5a3a6c4b2f6c9e3dfe3d21f3b1b6f3c4a1",
    dex: "Trader Joe v2 (mock)",

    // ----------------------------------
    // Token metadata
    // ----------------------------------
    tokenAName: "Avalanche",
    tokenASymbol: "AVAX",
    tokenBName: "USD Coin",
    tokenBSymbol: "USDC",

    // ----------------------------------
    // Legacy fields (UI usage)
    // ----------------------------------
    liquidityUsd: 12_450_000,
    volume24hUsd: 3_210_000,
    volume7dUsd: 18_900_000,
    tx24h: 842,
    tx7d: 5_301,
    feePct: 0.003,
    volatilityPct: 0.9,
    priceImpactPct: 0.42,
    dataAgeHours: 0.5,

    // ----------------------------------
    // AVAX scoring inputs (alpha)
    // ----------------------------------
    liquidityDepthUsd: 12_450_000,
    liquidityConcentrationPct: 28,
    feeStabilityPct: 72,
    volatilityImpactPct: 0.6,

    contractIsProxy: false,
    contractIsUpgradeable: false,
    contractAdmin: null,
    contractOwner: null,
    contractHasTimelock: null,

    protocolDependencies: ["incentives"],
    poolUpdatedAt: new Date().toISOString(),
  },
  {
    poolId: "avax-joi-avax-v2",
    mintA: "JOE",
    mintB: "AVAX",
    poolAddress: "0x4b5a5f1b7a4c2e9d2a9f5a1c0e5b7f1d3a9c1b22",
    dex: "Trader Joe v2 (mock)",
    tokenAName: "Joe",
    tokenASymbol: "JOE",
    tokenBName: "Avalanche",
    tokenBSymbol: "AVAX",

    liquidityUsd: 4_820_000,
    volume24hUsd: 580_000,
    volume7dUsd: 3_950_000,
    tx24h: 214,
    tx7d: 1_130,
    feePct: 0.003,
    volatilityPct: 1.8,
    priceImpactPct: 1.6,
    dataAgeHours: 1.2,

    liquidityDepthUsd: 4_820_000,
    liquidityConcentrationPct: 46,
    feeStabilityPct: 60,
    volatilityImpactPct: 1.7,

    contractIsProxy: true,
    contractIsUpgradeable: true,
    contractAdmin: "0x92c1f3b2c0d8a57a4d2a1b1f9d3a5f6e7c8b9a0d",
    contractOwner: "0x18b3a3e2c4f5d6e7a8b9c0d1e2f3a4b5c6d7e8f9",
    contractHasTimelock: false,

    protocolDependencies: ["emissions", "oracle"],
    poolUpdatedAt: new Date().toISOString(),
  },
  {
    poolId: "avax-weth-usdt-v2",
    mintA: "WETH",
    mintB: "USDT",
    poolAddress: "0x2b9c0d7a1e3f5c6b7a8d9e0f1a2b3c4d5e6f7a8b",
    dex: "Generic AMM v2 (mock)",
    tokenAName: "Wrapped Ether",
    tokenASymbol: "WETH",
    tokenBName: "Tether USD",
    tokenBSymbol: "USDT",

    liquidityUsd: 1_980_000,
    volume24hUsd: 95_000,
    volume7dUsd: 520_000,
    tx24h: 48,
    tx7d: 210,
    feePct: 0.003,
    volatilityPct: 2.4,
    priceImpactPct: 2.9,
    dataAgeHours: 6.8,

    liquidityDepthUsd: 1_980_000,
    liquidityConcentrationPct: 74,
    feeStabilityPct: 35,
    volatilityImpactPct: 3.1,

    contractIsProxy: null,
    contractIsUpgradeable: null,
    contractAdmin: null,
    contractOwner: null,
    contractHasTimelock: null,

    protocolDependencies: ["incentives", "emissions"],
    poolUpdatedAt: new Date().toISOString(),
  },
];
