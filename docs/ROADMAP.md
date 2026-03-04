# TRAXR-AVAX Roadmap

TRAXR-AVAX is being built as deterministic risk infrastructure for Avalanche:
on-chain-native indexing, reproducible pool-level scoring, and integration-ready API access.

## North Star
- Become the default deterministic pool-risk layer for AVAX wallets, DEX frontends, and analytics tools.
- Keep methodology transparent and auditable while scaling protocol coverage and data depth.

## Phase A - Productionize Native Indexing (Current -> Near Term)
### Goals
- Stabilize Avalanche-native pool ingestion across active AVAX DEX adapters.
- Improve runtime and completeness for top-N pool snapshots per DEX.

### Deliverables
- Hardened adapter coverage for enabled AVAX DEX set.
- Reliable top-30-per-DEX snapshot generation from C-Chain RPC.
- Better handling of non-standard token contracts (metadata fallbacks, retry classification).
- Clear run profiles (`fast`, `standard`, `deep`) with documented env flags.

### Success Criteria
- Consistent successful runs on public RPC without manual intervention.
- Deterministic output schema compatibility with TRAXR UI/API.
- Runtime target for standard runs: practical for frequent refresh cycles.

## Phase B - Own Avalanche Data Plane (Node + Indexer)
### Goals
- Reduce dependence on third-party RPCs for critical indexing paths.
- Control throughput, latency, and reliability for deterministic scoring.

### Deliverables
- Self-hosted Avalanche node environment with monitoring/alerts.
- Indexed event/state pipeline optimized for pool discovery + metrics windows.
- Multi-provider failover policy (self-hosted primary, external fallback).
- Backfill strategy for historical windows used by trend and verification flows.

### Success Criteria
- Measurable reduction in timeouts/retry stalls.
- Predictable indexing latency and stable fetch completion windows.
- Auditability of data lineage from chain source to normalized snapshot.

## Phase C - Deterministic Risk Layer Expansion
### Goals
- Deepen pool-level risk interpretation without sacrificing determinism.
- Increase explanatory power for end-users and integrators.

### Deliverables
- Broader contract posture signals (owner/admin/timelock/proxy coverage depth).
- Richer combination logic for TRAXR Console interpretation.
- Improved confidence/coverage fields surfaced in API responses.
- Ongoing validation against independent references (parity sanity checks, not 1:1 mirroring).

### Success Criteria
- More pools with complete high-confidence signal coverage.
- Higher explanatory quality in UI/console with less ambiguous interpretation.
- Stable, reproducible scoring behavior across refresh cycles.

## Phase D - Integration & Distribution (API Product)
### Goals
- Make TRAXR risk context easy to consume by wallets, DEXs, and data platforms.
- Establish monetization through API distribution.

### Deliverables
- Integration-ready API patterns (score lookup, pool snapshots, trend, alerts).
- Versioned response contracts and integration docs.
- Usage analytics and reliability reporting for partner integrations.
- Commercial packaging path (tiers / partner SLAs / enterprise support).

### Success Criteria
- Live external integrations consuming TRAXR endpoints.
- Clear API adoption metrics (requests, retention, endpoint usage mix).
- Monetization path validated through partner demand.

## Phase E - Scale Beyond Initial Coverage
### Goals
- Expand deterministic risk infrastructure while preserving AVAX-first quality.

### Deliverables
- Additional AVAX protocol adapters and deeper pool universe coverage.
- Optional multi-chain extension once AVAX execution quality is fully mature.

### Success Criteria
- Expanded coverage without regression in determinism or transparency.
- Maintained API reliability and interpretation quality at larger scale.

## Guiding Constraints
- No hidden data rewriting.
- No opaque score mutation outside documented methodology.
- Unknown values remain explicit.
- Source provenance remains visible in UI and API.
