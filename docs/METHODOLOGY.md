# TRAXR-AVAX Methodology (Alpha)

This document defines how TRAXR-AVAX sources, normalizes, and interprets pool data.

## 1) Data Sourcing
- Primary source: Avalanche C-Chain RPC (native on-chain reads/logs).
- Secondary source: retained historical GeckoTerminal snapshots for baseline comparison during migration.
- Trend/Compare views visibly segment sources (GeckoTerminal vs Avalanche RPC) for provenance transparency.

## 2) Discovery & Coverage
- Pools are discovered per DEX via protocol-specific adapters.
- Log/event reads are chunked for RPC reliability.
- Selection is capped per DEX (`TRAXR_MAX_POOLS_PER_DEX`) after candidate ranking.

## 3) Normalization
- Raw protocol outputs are mapped into a stable, deterministic pool schema used by TRAXR UI/API.
- Unknown values remain explicit (`null` / missing), never silently guessed.
- Provenance fields (`dataSource`, `addressSource`, DEX id) are preserved.

## 4) Derived Metrics
- Derived fields are computed but explicitly treated as heuristic (not protocol guarantees).
- Key examples:
  - liquidity depth (USD)
  - concentration (%)
  - execution resilience interpretation (from impact behavior)
  - fee stability (%)

## 5) Scoring & Interpretation
- CTS scoring is delegated to `@crosswalk.pro/traxr-cts-avax`.
- UI interpretation uses node semantics where higher node score means better posture.
- `Execution Resilience` is a positive-quality node label: higher is better.
- UI uses `Signals` terminology (`Risk` / `Info`) while payload compatibility keeps `warnings` key.

## 6) Verification Approach
- Native output is periodically compared against Gecko snapshots for sanity checks (not exact parity requirement).
- Differences are reviewed by metric category (liquidity, volume, tx count, fee, concentration).
- Source transitions are made explicit in visuals and docs.

## 7) Snapshot Run Profiles (MVP Operations)
- Fast profile: frequent refresh for UI/API usage (lower candidate breadth, faster completion).
- Deep profile: periodic validation/backfill runs (higher candidate breadth/chunk depth).
- Final pool counts in UI are post-filter snapshot counts, not raw discovered totals.

Known runtime bottlenecks:
- high candidate multiplier settings,
- retries on non-standard token contracts,
- partial but heavy incremental indexing for V3/Balancer.

## 8) Non-Goals (Current Alpha)
- No custody/signing/trading execution.
- No hidden data rewriting.
- No opaque confidence inflation; uncertainty is explicit.
