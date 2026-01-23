# TRAXR-AVAX Architecture (Alpha)

TRAXR-AVAX is a read-only indexing and normalization layer for AVAX DeFi data.
Scoring and risk interpretation are intentionally decoupled into a separate
npm package.

Indexing never guesses. Scoring never rewrites facts.

## Layered System
### Layer 1 - Indexed Market & Protocol Data (Live, Verifiable)
- Source: GeckoTerminal pool data
- Outputs: pool identifiers, token metadata, liquidity, volume, DEX attribution
- Source-backed, reproducible, and high-confidence

### Layer 2 - Derived Heuristics (Computed, Best-Effort)
- Liquidity depth
- Volatility impact
- Fee tier estimates (when inferable)
- Marked as derived and non-authoritative

### Layer 3 - Risk & Structural Signals (Decoupled)
- Liquidity concentration
- Fee stability
- Governance and upgradeability risk
- Resolved by the scoring engine package, not by the indexer

## Core Pipeline
1. **Data Ingestion**
   - Snapshot-based ingestion from GeckoTerminal
   - AVAX C-Chain pools only

2. **Normalization**
   - Deterministic mapping into AVAX pool metrics
   - Stable identifiers and field naming

3. **Scoring (External)**
   - Handled by `@crosswalk.pro/traxr-cts-avax`
   - Pure, deterministic scoring logic

4. **Presentation**
   - Next.js UI for CTS nodes, breakdowns, warnings
   - Read-only API under `/api/traxr/*`

## Transparency Rules
- Unknown values are intentional and explicit
- Derived metrics are labeled as heuristic
- Source-backed values are never overwritten

## Alpha Constraints
- No full indexer
- No trading or portfolio features
- No signing or custody
- Limited on-chain resolution

## Future (Optional)
- On-chain pool address resolution
- Protocol-specific contract decoding
- Snapshot trend history
- Cross-chain aggregation
