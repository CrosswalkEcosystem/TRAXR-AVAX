# TRAXR-AVAX (Alpha)
### Pool & Contract Risk Intelligence

![Status](https://img.shields.io/badge/status-alpha-blue)
![Network](https://img.shields.io/badge/network-AVAX-black)
![License](https://img.shields.io/badge/license-Proprietary-red)

TRAXR-AVAX is an alpha, read-only intelligence layer for AVAX pools. It ingests
pool fixtures and contract flags, normalizes the inputs, and produces a unified
score (0-100), CTS nodes (1-6), and human-readable warnings.

This is not a full product rewrite. It is a minimal infrastructure experiment
focused on correctness, clarity, and determinism.

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

## Fixtures (Alpha)
The alpha uses JSON fixtures as the input source. The UI will load the newest
snapshot in `data/` if present.

Run:
```
node scripts/fetch_avax_pools.js
```

Why JSON?
JSON-based data is a temporary bootstrap layer. It enables rapid iteration
without a full indexer.

## API (read-only)
Fuzzy matching works on mintA/mintB, token names, symbols, and addresses.

Example:
```
GET http://localhost:3000/api/traxr/score?mintA=AVAX&mintB=USDC
```

Response includes:
- pool ID
- TRAXR score (0-100) and CTS nodes (1-6)
- dimensional breakdown: depth, concentration, impact, fee stability, contract risk, dependencies
- warnings and raw metrics used for computation

Additional endpoints:
- `GET /api/traxr/pools`
- `GET /api/traxr/pools/:id`
- `GET /api/traxr/pool-trend?poolId=...`
- `GET /api/traxr/alerts`

## Architecture (Alpha)
- `src/lib/scoringAdapter.ts` - placeholder scorer (local heuristics).
- `src/lib/traxrService.ts` - loads local AVAX pool data, caches and scores pools.
- `src/app/api/traxr/*` - read-only HTTP surface for consumers.
- `src/components/*` - dashboard UI components.
- `scripts/fetch_avax_pools.js` - fixture generator (alpha).

## Status
TRAXR-AVAX is currently in alpha. Public endpoints, UI components, and scoring
integration are functional. Data adapters and on-chain reads are intentionally
minimal.

## License
UNLICENSED - proprietary module.
