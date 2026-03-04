# TRAXR-AVAX Scoring Overview (Public)

This document explains **how TRAXR score is computed at a high level** without exposing private package internals.

## Purpose
TRAXR score is a deterministic pool-level risk signal for Avalanche DeFi pools.

- Input: normalized on-chain pool metrics
- Output: `score (0-100)`, `ctsNodes (1-6)`, node breakdown, and signals
- Goal: make pool structure/risk posture comparable and machine-consumable

## Inputs (Normalized Metrics)
TRAXR consumes normalized fields such as:
- liquidity depth (USD)
- trading activity context (volume/tx relative to depth)
- execution resilience context (impact behavior)
- fee stability
- contract posture signals (proxy/admin/owner/timelock)
- protocol dependency signals

Unknown values remain explicit and are handled deterministically.

## Node Model
Score is composed from six CTS nodes:
- Liquidity Depth
- Trading Activity
- Execution Resilience
- Fee Stability
- Contract Risk
- Dependencies

Each node is normalized into a `0-100` range where **higher means better posture**.

## Aggregation Principles
- Deterministic: same input -> same output
- No hidden manual overrides
- Explicit handling of missing/unknown fields
- Bounded outputs (`0-100`)
- Signal generation (`Risk` / `Info`) from rule-based thresholds

## What We Do Not Expose Publicly
- Private package source code
- Exact internal weighting constants
- Internal tuning artifacts used for package iteration

## How To Interpret
- TRAXR score is not a trading recommendation.
- It is a structural/risk interpretation layer.
- Node breakdown should be read together with score and signals.

## Transparency Commitments
- Data provenance is visible (`dataSource`, source-segmented trend/compare)
- Derived metrics are labeled heuristic
- Raw indexed values are not overwritten by scoring
