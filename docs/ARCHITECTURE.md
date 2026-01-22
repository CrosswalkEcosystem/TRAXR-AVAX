# TRAXR-AVAX Architecture (Alpha)

TRAXR-AVAX is a read-only, deterministic analytics system focused on AVAX pool
and contract risk. The current alpha uses JSON fixtures and placeholder
heuristics to validate the pipeline end-to-end.

## Principles
- Deterministic inputs and scoring
- Minimal scope, explicit TODOs
- Read-only (no signing, no custody)
- Modular separation between adapters, scoring, and presentation

## Core Pipeline
1. **Data Ingestion**
   - JSON fixtures for AVAX pools
   - Optional minimal on-chain reads (future)

2. **Normalization**
   - Map raw inputs into normalized AVAX pool metrics
   - Ensure deterministic fields across runs

3. **Scoring**
   - Placeholder heuristics for:
     - liquidity depth
     - liquidity concentration
     - fee stability
     - volatility impact
     - contract posture
     - protocol dependencies

4. **Presentation**
   - Next.js UI for CTS nodes, breakdowns, warnings
   - Read-only API under `/api/traxr/*`

## Alpha Constraints
- No full indexer
- No trading or portfolio features
- No signing or custody
- Single DEX abstraction (AMM v2/v3 style)

## Future (Optional)
- Minimal adapters for live pools
- Contract introspection and admin detection
- Snapshot trend history
- Public API enhancements
