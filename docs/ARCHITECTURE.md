# TRAXR-AVAX Architecture (Alpha)

TRAXR-AVAX is a read-only indexing and normalization layer for AVAX DeFi data.
Scoring and risk interpretation are intentionally decoupled into a separate
npm package.

Indexing never guesses. Scoring never rewrites facts.

## Layered System
### Layer 1 - Indexed Market & Protocol Data (Live, Verifiable)
- Source: Avalanche C-Chain RPC (native)
- Outputs: pool identifiers, token metadata, liquidity, volume, DEX attribution
- Source-backed, reproducible, and high-confidence
- GeckoTerminal is retained as an explicit comparison/verification source

### Layer 2 - Derived Heuristics (Computed, Best-Effort)
- Liquidity depth
- Execution resilience (derived from impact behavior)
- Fee tier estimates (when inferable)
- Marked as derived and non-authoritative

### Layer 3 - Risk & Structural Signals (Decoupled)
- Liquidity concentration
- Fee stability
- Governance and upgradeability risk
- Resolved by the scoring engine package, not by the indexer

## Core Pipeline
1. **Data Ingestion**
   - Snapshot-based ingestion from Avalanche RPC using protocol-specific adapters
   - Chunked/block-range RPC log scanning with retries
   - AVAX C-Chain pools only

2. **Normalization**
   - Deterministic mapping into AVAX pool metrics
   - Stable identifiers and field naming

3. **Scoring (External)**
   - Handled by `@crosswalk.pro/traxr-cts-avax`
   - Pure, deterministic scoring logic

4. **Presentation**
   - Next.js UI for CTS nodes, breakdowns, signals, trend/compare, and TRAXR Console interpretation panels
   - Trend/Compare explicitly segment historical sources (GeckoTerminal vs Avalanche RPC) for visible provenance
   - Read-only API under `/api/traxr/*`

## Transparency Rules
- Unknown values are intentional and explicit
- Derived metrics are labeled as heuristic
- Source-backed values are never overwritten
- Signal naming in UI is user-facing (`Signals` with `Risk`/`Info`), payload remains backward-compatible
- Legacy Gecko snapshots may be retained for comparison; source transitions are shown visually in charts

## Alpha Constraints
- No full indexer
- No trading or portfolio features
- No signing or custody
- Limited on-chain resolution

## Future (Optional)
- Broader protocol adapter coverage
- Deeper contract/admin provenance coverage
- Snapshot trend and comparison refinement
- Cross-chain aggregation
