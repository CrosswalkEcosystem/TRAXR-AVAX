# TRAXR-AVAX (Alpha)
### Pool & Contract Risk Intelligence

![Status](https://img.shields.io/badge/status-alpha-blue)
![Network](https://img.shields.io/badge/network-AVAX-black)
![License](https://img.shields.io/badge/license-Proprietary-red)

TRAXR-AVAX is a foundational indexing and normalization layer for the Avalanche
DeFi ecosystem. The current deployment establishes a clean, verifiable data
substrate; higher-order analytics and scoring run in a separate, decoupled
engine.

This is not a full product rewrite. It is a minimal infrastructure experiment
focused on correctness, clarity, and determinism.

Indexing never guesses. Scoring never rewrites facts.

## Documentation
- [ROADMAP](docs/ROADMAP.md)
- [ARCHITECTURE](docs/ARCHITECTURE.md)

## Quickstart
```
npm install
npm run dev
# http://localhost:3000
```

## Environment Configuration
### Core flags
- `NEXT_PUBLIC_TRAXR_ENABLED=true|false` - toggle TRAXR-AVAX UI.
- `TRAXR_FALLBACK_SAMPLE=true` - load embedded sample pools.
- `TRAXR_LOCAL_POOLS_PATH` - path to AVAX pool JSON (default: newest `data/avaxPools_*.json`, fallback `data/avaxPools.json`).

## Layered Architecture
### Layer 1 - Indexed Market & Protocol Data (Live, Verifiable)
- Ingests AVAX AMM pools from GeckoTerminal
- Normalizes pool identifiers, token metadata, liquidity and volume
- Source-backed and reproducible

### Layer 2 - Derived Heuristics (Computed, Best-Effort)
- Liquidity depth, volatility impact, inferred fee tiers (where possible)
- Marked as derived, never treated as protocol guarantees

### Layer 3 - Risk & Structural Signals (Decoupled)
- Liquidity concentration, fee stability, governance and upgradeability risk
- Computed in a separate scoring engine, not inside the indexer

## Fixtures (Alpha)
The alpha uses JSON snapshots as the input source. The UI will load the newest
snapshot in `data/` if present.

Run:
```
node scripts/fetch_avax_pools_gecko.js
```

## Scoring Engine (npm)
TRAXR-AVAX uses a dedicated scoring package:

- `@crosswalk.pro/traxr-cts-avax`

The app consumes normalized pool data and delegates scoring to this package.
Unknown values are intentional until the scoring engine resolves them.

## API (read-only)
Fuzzy matching works on mintA/mintB, token names, symbols, and addresses.

Example:
```
GET http://localhost:3000/api/traxr/score?mintA=AVAX&mintB=USDC
```

Response includes:
- pool ID
- TRAXR score (0-100) and CTS nodes (1-6)
- dimensional breakdown and warnings
- normalized metrics used for computation

Additional endpoints:
- `GET /api/traxr/pools`
- `GET /api/traxr/pools/:id`
- `GET /api/traxr/pool-trend?poolId=...`
- `GET /api/traxr/alerts`

## Status
TRAXR-AVAX is in alpha. Indexing and normalization are live; on-chain resolution
and protocol-specific scoring expand via the npm scoring engine over time.

## License
UNLICENSED - proprietary module.
