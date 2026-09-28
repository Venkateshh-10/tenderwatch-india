# Architecture

TenderWatch is a Next.js App Router application. SQLite stores company profiles, search runs, sources, tenders, requirements, readiness evaluations, and watchlist items through Prisma.

```text
Company DNA
    ↓
Query Planner
    ↓
SerpApi Google Search + Google News
    ↓
Normalization and source authority
    ↓
Deduplication
    ↓
Requirement extraction
    ↓
Deterministic readiness engine
    ↓
BID / REVIEW / SKIP
    ↓
Snapshot diff (Time Machine)
    ↓
Evidence graph
```

Live mode runs only when `SERPAPI_API_KEY` is present. Demo mode stores fixtures with `dataMode = demo` and never presents them as SerpApi results. A live failure does not switch to demo data.

The SerpApi client lives in `src/lib/serpapi` and is imported only from server code. Cached payloads are normalized hits, not the raw credentialed request.

`recordSnapshot` writes a `TenderSnapshot` when the normalized payload hash changes. The first snapshot has no diff. Later hashes are compared in `diffPayloads`, and only those differences become `TenderChange` rows. `POST /api/tenders/[id]/refresh` calls `refreshTender`. In demo mode that route does not call SerpApi. In live mode it runs `planChangeQueries`, bypasses the cache, and keeps hits that share the tender reference, the primary URL, or a title overlap of at least 0.45.

`buildEvidenceGraph` adds a buyer, department, Tier A or B source, corrigendum, amendment, extension, cancellation, or related tender only when that fact is already stored. The React Flow canvas keeps its attribution.
