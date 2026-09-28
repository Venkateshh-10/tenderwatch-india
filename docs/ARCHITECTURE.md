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
```

Live mode runs only when `SERPAPI_API_KEY` is present. Demo mode stores fixtures with `dataMode = demo` and never presents them as SerpApi results. A live failure does not switch to demo data.

The SerpApi client lives in `src/lib/serpapi` and is imported only from server code. Cached payloads are normalized hits, not the raw credentialed request.

Time Machine and the evidence graph are intentionally not part of this build.
