# TenderWatch India

**Search-native tender intelligence and evidence-backed bid readiness for Indian SMEs.**

Find the right government opportunity. Know if you qualify. See the evidence. Never miss a change.

## Problem

Finding tenders is not enough. Notices are scattered across government sites, departments, and news. An SME still has to decide whether turnover, certifications, EMD, experience, and the closing date actually allow a bid, and whether the notice changed after they found it.

## Solution

```text
Company DNA
→ Live SerpApi
→ Real tender
→ Evidence
→ Eligibility
→ BID / REVIEW / SKIP
→ Monitor changes
```

TenderWatch plans searches from one company profile, retrieves public Google Search and Google News results through SerpApi, and turns the text it can actually read into a deterministic BID, REVIEW, or SKIP. Unknown facts stay unknown.

## Why this is different

Existing platforms often focus on portal aggregation, alerts, and summaries.

TenderWatch focuses on dynamic live search, search provenance, requirement-level evidence, deterministic readiness, and change reconstruction. It does not claim to be the first AI tender platform.

## Why SerpApi

SerpApi is the live sensing layer. TenderWatch does not log in to GeM or CPPP.

- **Google Search** finds indexed notices, RFPs, EOIs, NITs, exact references, corrigenda, amendments, extensions, and cancellations. Parameters are `gl=in`, `hl=en`, and `google.co.in`.
- **Google News** finds procurement announcements and context. A news item supports a notice. It does not become a hard eligibility fact by itself.
- **Query planner** builds about 5 Google searches and 2 news searches from Company DNA, then drops duplicates.
- **Change search** re-queries a watched notice by reference, corrigendum language, and one news query. Refresh bypasses the cache.
- **Search provenance** stores the engine, query, parameters, position, domain, URL, and retrieval time on every result.

## Architecture

```text
Company DNA
    ↓
Query planner
    ↓
SerpApi Google Search + Google News
    ↓
Normalize, classify authority, dedupe
    ↓
Extract requirements that the text actually states
    ↓
Deterministic readiness
    ↓
BID / REVIEW / SKIP
    ↓
Snapshot diff (Time Machine)
    ↓
Evidence graph
```

A failed search says `Live search unavailable.` If an earlier successful SerpApi run is stored, the desk says `Showing last verified live result` with that timestamp. If nothing has been retrieved, it says `No verified data available.` Sample tenders are not used.

## Setup

```bash
git clone https://github.com/Venkateshh-10/tenderwatch-india.git
cd tenderwatch-india
npm install
cp .env.example .env.local
```

Put the key only in `.env.local`:

```env
SERPAPI_API_KEY=your_key_here
DATABASE_URL="file:./prisma/dev.db"
```

Then:

```bash
npx prisma migrate dev
npm run dev
```

Open the local URL Next prints. Company DNA starts with an example SME, Acme Vision Systems Pvt Ltd. That profile is company input, not a tender.

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
```

## Live-data policy

Every notice on screen comes from a SerpApi response that was stored. Eligibility facts keep an evidence status: VERIFIED, SUPPORTED, UNVERIFIED, or UNKNOWN. A change appears only when two stored snapshots differ. The first snapshot is a baseline, not a change.

## Security

The SerpApi key is read only on the server. Do not create `NEXT_PUBLIC_SERPAPI_API_KEY`. `.env`, `.env.local`, and SQLite files are gitignored. `.env.example` contains empty placeholders.

The app does not log in to government portals, bypass access controls, or submit bids.

## Testing

Unit tests cover query caps, source classification, deduplication, deadline comparison, turnover, certification, company age, EMD blockers, unknown evidence, SerpApi payload normalization, cache keys, snapshot diffs, buyer extraction, and the evidence graph. Tests use captured structures in the test file. They do not call SerpApi and are not shown in the product.

## Limitations

- Search visibility depends on what Google has indexed.
- TenderWatch is decision support. The official tender document remains authoritative.
- Missing evidence stays UNKNOWN or REVIEW. The app does not fill gaps.
- Snippet-only facts are treated more cautiously than text fetched from a public page.
- A page that cannot be fetched is marked SOURCE NOT VERIFIED.
- Time Machine stays empty until a later live check actually differs.
- TenderWatch does not submit bids.

## AI disclosure

This repository was built with Cursor, using the Grok 4.7 coding agent. The running application does not call an LLM. Eligibility decisions are deterministic rules. `OPENAI_API_KEY` is unused.

## Recording

See `docs/DEMO_SCRIPT.md` for the three-minute live path. Do not invent a corrigendum for the recording.
