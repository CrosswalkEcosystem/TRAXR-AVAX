# TRAXR-AVAX Integration Examples

This guide shows practical patterns for integrating TRAXR-AVAX risk context into products.

Base URL (local):
`http://localhost:3000/api/traxr`

## 1) Wallet Token Pair Check
Use when user opens a swap screen and wallet needs a quick pool-risk snapshot.

Request:
```http
GET /api/traxr/score?mintA=AVAX&mintB=USDC
```

Expected usage:
- Show TRAXR score and CTS nodes near route quote.
- Show `Signals` summary (`risk` / `info`) for user awareness.
- Link to deeper trend view if user wants context.

## 2) DEX Pool List Enrichment
Use when rendering a pool table or route candidates.

Request:
```http
GET /api/traxr/pools
```

Expected usage:
- Merge TRAXR score into your existing pool rows.
- Sort/filter by score band, depth, activity, or concentration.
- Highlight pools with elevated risk signals.

## 3) Pool Detail Page
Use when user opens one specific pool.

Request:
```http
GET /api/traxr/pools/:id
```

Expected usage:
- Render full node breakdown (`depth`, `activity`, `impact/execution resilience`, `stability`, `trust`, `dependencies`).
- Show source/provenance fields (`dataSource`, `addressSource`, `dex`, timestamps).
- Render signal list with clear `Risk` vs `Info` semantics.

## 4) Trend / Compare Module
Use for historical analysis and migration transparency.

Request:
```http
GET /api/traxr/pool-trend?poolId=<POOL_ID>
```

Expected usage:
- Plot score and node history over time.
- Visibly segment source transitions (legacy Gecko snapshots vs Avalanche RPC snapshots).
- Add compare mode for before/after behavior checks.

## 5) Alert Feed
Use for notification systems and dashboards.

Request:
```http
GET /api/traxr/alerts
```

Expected usage:
- Trigger internal alerts for pools with deteriorating node profile.
- Route to operations/risk teams or user-facing warnings.
- Keep alert logic deterministic and versioned.

## 6) Suggested Integration UX Patterns
- Keep score visible, but always pair it with node breakdown.
- Prefer simple labels in UI:
  - `Execution Resilience` (higher is better)
  - `Signals` (`Risk` / `Info`)
- Show provenance and freshness so users trust the data context.

## 7) Minimal Frontend Fetch Example
```ts
const res = await fetch("/api/traxr/score?mintA=AVAX&mintB=USDC");
if (!res.ok) throw new Error("TRAXR request failed");
const data = await res.json();

// Use in UI
console.log(data.score, data.ctsNodes, data.nodes, data.warnings);
```

## 8) Integration Checklist
- Validate endpoint latency under your expected traffic.
- Cache read-heavy endpoints (`/pools`, `/pool-trend`) where possible.
- Treat unknown/null fields as explicit unknowns (do not silently guess).
- Version integration behavior to avoid accidental scoring interpretation drift.
