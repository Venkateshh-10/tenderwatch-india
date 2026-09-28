# TenderWatch India

Find the right government opportunity. Know if you qualify. See the evidence.

TenderWatch is search-native tender intelligence for Indian SMEs. It plans queries from a company profile, discovers public notices, and turns the evidence it can actually read into a BID, REVIEW, or SKIP decision.

## Problem

Finding a tender is not the same as knowing whether a small company can pursue it. Notices are scattered across government sites, departments, and news. Eligibility rules are easy to miss, and a listing alone does not say whether turnover, certifications, EMD, or the closing date block a bid.

## Solution

TenderWatch connects four steps:

1. Company DNA describes what the business can do and what it will not accept.
2. A query planner builds a short set of Google Search and Google News queries.
3. Results are normalized, deduplicated, and checked for requirements that are actually present in the text.
4. A deterministic readiness engine returns BID, REVIEW, or SKIP with the evidence beside the decision.

## Live and demo modes

- **Live.** If `SERPAPI_API_KEY` is set in `.env.local`, Discover calls SerpApi. Only those responses are stored as live notices.
- **Demo.** If the key is missing, the app does not invent a live search. It shows labeled fixtures so the decision workflow can be reviewed. Demo records use `demo.tenderwatch.invalid` and are stored separately from live rows.

A failed live search does not fall back to demo data.

## Why SerpApi

SerpApi is the live discovery layer. The app does not scrape GeM or CPPP logins.

### Google Search

Finds indexed tender notices and official pages with India-focused parameters (`gl=in`, `hl=en`, `google.co.in`).

### Google News

Finds announcement and context items. News stays supporting evidence unless the text itself is an authoritative notice.

### Query planner

Builds a capped set of searches from Company DNA: official domains, procurement phrases, capability terms, geography, and one or two news queries. Discovery stays around 5 Google searches and 2 news searches.

### Search provenance

Every stored result keeps the engine, query, localization, position, domain, and retrieval time. Demo rows say SerpApi was not called.

## Architecture

```text
Company DNA
    ↓
Query Planner
    ↓
SerpApi (or labeled demo fixtures when no key is set)
    ↓
Normalization
    ↓
Deduplication
    ↓
Evidence extraction
    ↓
Readiness engine
    ↓
BID / REVIEW / SKIP
```

Time Machine and the evidence graph are not in this build.

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

Open the local URL Next prints. Company DNA is prefilled with an example SME, Acme Vision Systems Pvt Ltd. That profile is user input, not tender data.

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
```

## Security

The SerpApi key is read only on the server. Do not create `NEXT_PUBLIC_SERPAPI_API_KEY`. `.env`, `.env.local`, and SQLite files are gitignored. `.env.example` contains empty placeholders.

The app does not log in to government portals, bypass access controls, or submit bids.

## Testing

Unit tests cover query caps, source classification, deduplication, deadline comparison, turnover, certification, company age, and EMD blockers, unknown evidence, SerpApi payload normalization, and cache keys. Tests use captured structures in the test file. They do not call SerpApi and are not shown in the product UI.

## Limitations

- Search visibility depends on what search engines have indexed.
- TenderWatch is decision support. The official tender document remains authoritative.
- Missing evidence stays UNKNOWN or REVIEW. The app does not fill gaps with guesses.
- TenderWatch does not submit bids.
- Snippet-only facts are treated more cautiously than text fetched from a public page.
- Change history and the evidence graph are not implemented yet.

## AI disclosure

This repository was built with Cursor, using the Grok 4.7 coding agent. The running application does not call an LLM. Eligibility decisions are deterministic rules. `OPENAI_API_KEY` is unused.
