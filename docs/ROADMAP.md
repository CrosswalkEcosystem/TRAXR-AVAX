# TRAXR-AVAX Roadmap (Alpha)

This roadmap is intentionally minimal. Each phase builds on a verified data
substrate before adding higher-order logic.

## Phase 1 - Indexing & Normalization (Current)
- GeckoTerminal ingestion (AVAX C-Chain)
- Normalized pool metadata and liquidity/volume
- Deterministic snapshots and local cache

## Phase 2 - On-Chain Resolution
- Pool address verification
- Fee tier and contract metadata validation
- Protocol-specific adapters (DEX by DEX)
- RPC reliability baseline (multi-provider fallback, caching, rate-limit handling)

## Infra & Reliability (Parallel Track)
- Goal: reduce dependence on third-party RPCs for critical indexing paths
- Define AVAX RPC requirements (throughput, latency, archive needs, costs)
- Operate a minimal self-hosted AVAX RPC stack (with observability and alerts)
- Keep third-party RPCs as explicit fallback and verification sources

## Phase 3 - Scoring Engine Expansion
- Enhanced heuristics and resolvers in npm package
- Clear confidence modeling and warnings
- No contamination of raw indexed data

## Phase 4 - Cross-Chain Aggregation
- Extend normalized model across chains
- Unified scoring pipeline with per-chain adapters

## Out of Scope
- Trading features
- Portfolio tracking
- Custody or transaction signing
- Full ecosystem coverage
