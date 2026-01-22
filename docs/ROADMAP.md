# TRAXR-AVAX Roadmap (Alpha)

This roadmap is intentionally minimal. The alpha focuses on feasibility and
determinism rather than coverage.

## M0 - Alpha Baseline
- Static JSON fixtures
- Deterministic scoring and warnings
- Read-only UI + API
- Clear separation between adapters, scoring, presentation

## M1 - Lightweight Adapters (Optional)
- Minimal on-chain reads for pool metadata
- Fee tier and pool address validation
- Contract posture flags (proxy/upgradeable/admin) where feasible

## M2 - Snapshot History (Optional)
- Periodic snapshot capture to `data/avaxPools_*.json`
- Trend visualization in UI

## Out of Scope
- Trading features
- Portfolio tracking
- Custody or transaction signing
- Full ecosystem coverage
