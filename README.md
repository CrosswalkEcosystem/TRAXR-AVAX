# TRAXR-AVAX (Alpha)
### Avalanche-Native Pool & Contract Risk Intelligence

![Status](https://img.shields.io/badge/status-alpha-blue)
![Network](https://img.shields.io/badge/network-AVAX-black)
![License](https://img.shields.io/badge/license-Proprietary-red)

TRAXR-AVAX is a foundational indexing and normalization layer for Avalanche
DeFi. The current deployment indexes pools natively from Avalanche C-Chain RPC,
normalizes them into a stable schema, and delegates deterministic CTS scoring to
an external package.

This is not a full product rewrite. It is a minimal infrastructure experiment
focused on correctness, clarity, and determinism.

Indexing never guesses. Scoring never rewrites facts.

## Why This Matters For Avalanche
- Pool-level risk remains fragmented across tools; TRAXR provides a deterministic, on-chain-grounded interpretation layer.
- Builders (wallets, DEX frontends, analytics tools) can consume a consistent risk surface through API endpoints.
- Source provenance is explicit, enabling transparent trust decisions instead of opaque scoring.
- The model is designed to be machine-consumable first, with UI as a reference implementation.

## Product Direction
TRAXR-AVAX is being developed as deterministic risk infrastructure for the Avalanche ecosystem:
- on-chain-native indexing,
- reproducible pool-level scoring,
- and low-friction API access for integrations.

This creates a clear path to monetization via API distribution (usage tiers / enterprise integrations) while keeping core methodology transparent and auditable.

## Documentation
- [ROADMAP](docs/ROADMAP.md)
- [ARCHITECTURE](docs/ARCHITECTURE.md)
- [METHODOLOGY](docs/METHODOLOGY.md)
- [INTEGRATION_EXAMPLES](docs/INTEGRATION_EXAMPLES.md)
- [SCORING_OVERVIEW](docs/SCORING_OVERVIEW.md)

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
- Ingests AVAX AMM pools from Avalanche C-Chain RPC (native)
- Normalizes pool identifiers, token metadata, liquidity and volume
- Source-backed and reproducible

### Layer 2 - Derived Heuristics (Computed, Best-Effort)
- Liquidity depth, execution resilience, inferred fee tiers (where possible)
- Marked as derived, never treated as protocol guarantees

### Layer 3 - Risk & Structural Signals (Decoupled)
- Liquidity concentration, fee stability, governance and upgradeability risk
- Computed in a separate scoring engine, not inside the indexer

## Snapshot Fetchers
The UI reads JSON snapshots. By default it loads the newest `data/avaxPools_*.json`.

Primary (Avalanche-native):
```
node scripts/fetch_avax_pools_avalanche.js
```

Reference / comparison:
```
node scripts/fetch_avax_pools_gecko.js
node scripts/fetch_pools_gecko_slelection.js
node scripts/verify_native_volume_vs_gecko.js
```

### Useful native fetch flags
- `AVAX_RPC_URL` (default `https://api.avax.network/ext/bc/C/rpc`)
- `TRAXR_MAX_POOLS_PER_DEX` (default `20`)
- `TRAXR_CANDIDATE_MULTIPLIER` (default `8`)
- `TRAXR_PAIR_SCAN_MODE` (`spread`/`tail`)
- `TRAXR_ENABLE_7D_VOLUME` (`true|false`, default `false`)
- `TRAXR_LOG_MAX_RANGE` (default `2000`)
- `TRAXR_OUTPUT_DIR` (default `data/`)

### Recommended Run Profiles
Fast production snapshot (frequent refresh, faster):
```powershell
$env:TRAXR_OUTPUT_DIR='data'; `
$env:TRAXR_MAX_POOLS_PER_DEX='30'; `
$env:TRAXR_CANDIDATE_MULTIPLIER='10'; `
$env:TRAXR_PAIR_SCAN_MODE='tail'; `
$env:TRAXR_ENABLE_7D_VOLUME='false'; `
$env:TRAXR_LOG_MAX_RANGE='1500'; `
$env:TRAXR_FILTER_MIN_LIQUIDITY_USD='0'; `
$env:TRAXR_FILTER_REQUIRE_24H_ACTIVITY='false'; `
$env:TRAXR_V3_MAX_CHUNKS_PER_RUN='400'; `
$env:TRAXR_BALANCER_MAX_CHUNKS_PER_RUN='120'; `
node scripts/fetch_avax_pools_avalanche.js
```

Deep validation snapshot (slower, periodic/nightly):
```powershell
$env:TRAXR_OUTPUT_DIR='data'; `
$env:TRAXR_MAX_POOLS_PER_DEX='30'; `
$env:TRAXR_CANDIDATE_MULTIPLIER='24'; `
$env:TRAXR_PAIR_SCAN_MODE='spread'; `
$env:TRAXR_ENABLE_7D_VOLUME='false'; `
$env:TRAXR_LOG_MAX_RANGE='1200'; `
$env:TRAXR_V3_MAX_CHUNKS_PER_RUN='1500'; `
$env:TRAXR_BALANCER_MAX_CHUNKS_PER_RUN='400'; `
node scripts/fetch_avax_pools_avalanche.js
```

Current runtime bottlenecks:
- High `TRAXR_CANDIDATE_MULTIPLIER` values.
- Retries on non-standard/broken token contracts.
- Partial but heavy incremental indexing for V3/Balancer.

### Historical Snapshot Note
- Legacy GeckoTerminal snapshots are intentionally retained for baseline comparison during migration.
- Trend/Compare views visually separate source segments (GeckoTerminal vs Avalanche RPC) with background/source cues to keep provenance explicit.

## Scoring Engine (npm)
TRAXR-AVAX uses a dedicated scoring package:

- `@crosswalk.pro/traxr-cts-avax`

The app consumes normalized pool data and delegates scoring to this package.
Unknown values are intentional until the scoring engine resolves them.

Notes:
- `Execution Resilience` node is interpreted as positive quality: higher is better.
- UI uses `Signals` terminology (risk/info), while internal payload key remains `warnings` for compatibility.

## API (read-only)
Fuzzy matching works on mintA/mintB, token names, symbols, and addresses.

Example:
```
GET http://localhost:3000/api/traxr/score?mintA=AVAX&mintB=USDC
```

Response includes:
- pool ID
- TRAXR score (0-100) and CTS nodes (1-6)
- dimensional breakdown and signals
- normalized metrics used for computation

Additional endpoints:
- `GET /api/traxr/pools`
- `GET /api/traxr/pools/:id`
- `GET /api/traxr/pool-trend?poolId=...`
- `GET /api/traxr/alerts`

Integration target:
- Wallets and DEXs can call TRAXR endpoints to enrich pool views with deterministic risk context.

## Status
TRAXR-AVAX is in alpha. Avalanche-native indexing, normalization, and UI
interpretation are live; protocol coverage and scoring refinements continue.

## Immediate Next (Post-MVP Hardening)
- Fetcher runtime optimization (smarter candidate prefiltering, reduced dead-token retries, better caching).
- Expanded adapter/index coverage where incremental indexes are still partial.
- Deterministic validation reports between consecutive snapshots.

## License
UNLICENSED - proprietary module.
